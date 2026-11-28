-- =====================================================================
-- 011 · Papeles: envío de documentos y firma
-- El usuario maestro envía; cada persona ve solo lo suyo, lo abre y lo firma o responde una vez.
-- El archivo y la respuesta no se pueden cambiar después.
-- Es firma SIMPLE con evidencias (nombre, trazo, hora del servidor, huella del archivo).
-- Para contratos y anexos hace falta además un proveedor de firma avanzada.
-- =====================================================================
create table if not exists public.papeles (
  id uuid primary key,
  restaurante_id uuid not null references public.restaurantes(id) on delete restrict,
  titulo text not null,
  requiere text not null check (requiere in ('firma','lectura')),
  archivo text not null unique,
  nombre_archivo text not null default '',
  huella text not null check (huella ~ '^[0-9a-f]{64}$'),
  limite date,
  creado_por uuid not null,
  creado timestamptz not null default now()
);
create table if not exists public.papeles_envios (
  papel_id uuid not null references public.papeles(id) on delete restrict,
  user_id uuid not null,
  nombre text not null default '',
  area text not null default 'todas',
  visto timestamptz,
  resultado text check (resultado in ('firmado','leido','no_conforme')),
  respondido timestamptz,
  firma_nombre text,
  firma_trazo text,
  comentario text,
  agente text,
  sello text,
  primary key (papel_id, user_id)
);
create index if not exists papeles_envios_persona on public.papeles_envios (user_id);

alter table public.papeles enable row level security;
alter table public.papeles_envios enable row level security;
revoke all on public.papeles, public.papeles_envios from anon, authenticated;
grant select on public.papeles, public.papeles_envios to authenticated;

-- ¿Se me ha enviado este papel? (definer para que las dos reglas no se llamen entre sí)
create or replace function public.papel_mio(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.papeles_envios e join public.papeles p on p.id = e.papel_id
    where e.papel_id = p_id and e.user_id = auth.uid() and public.rol_en(p.restaurante_id) is not null)
$$;
create or replace function public.papel_dirijo(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.papeles p where p.id = p_id and public.es_maestro(p.restaurante_id))
$$;

drop policy if exists papeles_ver on public.papeles;
create policy papeles_ver on public.papeles for select to authenticated
  using (public.es_maestro(restaurante_id) or public.papel_mio(id));
drop policy if exists envios_ver on public.papeles_envios;
create policy envios_ver on public.papeles_envios for select to authenticated
  using ((user_id = (select auth.uid()) and public.papel_mio(papel_id)) or public.papel_dirijo(papel_id));

-- Ni siquiera desde dentro: lo enviado no se toca y lo respondido tampoco
create or replace function public.papel_fijo() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'papeles' then
    raise exception 'Un documento enviado no se puede cambiar ni borrar.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' or old.resultado is not null then
    raise exception 'Una respuesta ya dada no se puede cambiar ni borrar.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists papeles_fijo on public.papeles;
create trigger papeles_fijo before update or delete on public.papeles for each row execute function public.papel_fijo();
drop trigger if exists envios_fijo on public.papeles_envios;
create trigger envios_fijo before update or delete on public.papeles_envios for each row execute function public.papel_fijo();

create or replace function public.enviar_papel(p_rid uuid, p_id uuid, p_titulo text, p_requiere text, p_archivo text,
  p_nombre_archivo text, p_huella text, p_limite date, p_personas uuid[]) returns integer
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  if not public.es_maestro(p_rid) then raise exception 'Solo el usuario maestro puede enviar documentos.'; end if;
  if length(trim(coalesce(p_titulo, ''))) < 3 then raise exception 'Ponle un título al documento.'; end if;
  if p_archivo not like p_rid::text || '/' || p_id::text || '/%' then raise exception 'La ruta del archivo no es válida.'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'papeles' and name = p_archivo) then raise exception 'El archivo no ha llegado a subirse.'; end if;
  insert into public.papeles (id, restaurante_id, titulo, requiere, archivo, nombre_archivo, huella, limite, creado_por)
  values (p_id, p_rid, left(trim(p_titulo), 140), p_requiere, p_archivo, left(coalesce(p_nombre_archivo, ''), 140), lower(p_huella), p_limite, auth.uid());
  insert into public.papeles_envios (papel_id, user_id, nombre, area)
  select p_id, m.user_id, m.nombre, m.area from public.miembros m
    where m.restaurante_id = p_rid and m.estado = 'activo' and m.user_id = any (p_personas);
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Elige al menos una persona.'; end if;
  return v_n;
end $$;

create or replace function public.abrir_papel(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.papeles_envios set visto = now()
  where papel_id = p_id and user_id = auth.uid() and visto is null and resultado is null and public.papel_mio(p_id)
$$;

create or replace function public.responder_papel(p_id uuid, p_resultado text, p_nombre text, p_trazo text, p_comentario text, p_huella text, p_agente text) returns text
language plpgsql security definer set search_path = public as $$
declare d public.papeles; e public.papeles_envios; v_ahora timestamptz := clock_timestamp(); v_sello text;
begin
  if not public.papel_mio(p_id) then raise exception 'Ese documento no es tuyo.'; end if;
  select * into d from public.papeles where id = p_id;
  select * into e from public.papeles_envios where papel_id = p_id and user_id = auth.uid() for update;
  if e.resultado is not null then raise exception 'Ese documento ya estaba respondido.'; end if;
  if e.visto is null then raise exception 'Abre el documento antes de responder.'; end if;
  if lower(coalesce(p_huella, '')) <> d.huella then raise exception 'El archivo que has visto no coincide con el enviado. No firmes y avisa a dirección.'; end if;
  if p_resultado = 'firmado' then
    if d.requiere <> 'firma' then raise exception 'Este documento solo pide confirmar la lectura.'; end if;
    if length(trim(coalesce(p_nombre, ''))) < 5 then raise exception 'Escribe tu nombre y apellidos.'; end if;
    if coalesce(p_trazo, '') !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' or length(p_trazo) > 200000 or length(p_trazo) < 600 then
      raise exception 'Dibuja tu firma en el recuadro.'; end if;
  elsif p_resultado = 'no_conforme' then
    if length(trim(coalesce(p_comentario, ''))) < 5 then raise exception 'Explica por qué no estás conforme.'; end if;
  elsif p_resultado <> 'leido' or d.requiere <> 'lectura' then
    raise exception 'Respuesta no válida.';
  end if;
  v_sello := encode(extensions.digest(convert_to(concat_ws('|', p_id, d.huella, auth.uid(), p_resultado,
    to_char(v_ahora at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), trim(coalesce(p_nombre, '')),
    coalesce(p_trazo, ''), trim(coalesce(p_comentario, ''))), 'UTF8'), 'sha256'), 'hex');
  update public.papeles_envios set resultado = p_resultado, respondido = v_ahora,
    firma_nombre = nullif(left(trim(coalesce(p_nombre, '')), 120), ''), firma_trazo = case when p_resultado = 'firmado' then p_trazo end,
    comentario = nullif(left(trim(coalesce(p_comentario, '')), 600), ''), agente = left(coalesce(p_agente, ''), 300), sello = v_sello
    where papel_id = p_id and user_id = auth.uid();
  return v_sello;
end $$;

revoke execute on function public.papel_mio(uuid), public.papel_dirijo(uuid), public.papel_fijo(),
  public.enviar_papel(uuid, uuid, text, text, text, text, text, date, uuid[]), public.abrir_papel(uuid),
  public.responder_papel(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.papel_mio(uuid), public.papel_dirijo(uuid),
  public.enviar_papel(uuid, uuid, text, text, text, text, text, date, uuid[]), public.abrir_papel(uuid),
  public.responder_papel(uuid, text, text, text, text, text, text) to authenticated;

-- Archivos: cajón privado. Sube el maestro; lo lee el maestro o quien lo ha recibido. Nadie lo cambia ni lo borra.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('papeles', 'papeles', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;
create or replace function public.papel_de_ruta(p_ruta text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.papeles p where p.archivo = p_ruta and public.papel_mio(p.id))
$$;
revoke execute on function public.papel_de_ruta(text) from public, anon;
grant execute on function public.papel_de_ruta(text) to authenticated;
drop policy if exists "papeles subir" on storage.objects;
create policy "papeles subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'papeles' and public.es_maestro(public.rid_de_ruta(name)));
drop policy if exists "papeles ver" on storage.objects;
create policy "papeles ver" on storage.objects for select to authenticated
  using (bucket_id = 'papeles' and (public.es_maestro(public.rid_de_ruta(name)) or public.papel_de_ruta(name)));
