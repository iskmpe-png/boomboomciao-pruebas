-- =====================================================================
-- 013 · Club de socios (solo nivel gratuito, versión de prueba)
-- Los datos de clientes van aparte de los del equipo (tablas club_). El alta nace CERRADA:
-- solo funciona cuando el usuario maestro la abre. Sin confirmar el correo no se envía nada.
-- =====================================================================
create table if not exists public.club_config (
  restaurante_id uuid primary key references public.restaurantes(id) on delete cascade,
  abierto boolean not null default false,
  actualizado timestamptz not null default now()
);
create table if not exists public.club_socios (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  numero integer not null,
  nombre text not null,
  correo text not null,
  movil text,
  nacimiento date,
  condiciones timestamptz not null,
  acepta_correo timestamptz,
  acepta_movil timestamptz,
  acepta_perfil timestamptz,
  version_textos text not null,
  origen text not null default 'web',
  clave_hash text not null unique,
  creado timestamptz not null default now(),
  confirmado timestamptz
);
create index if not exists club_socios_local on public.club_socios (restaurante_id, creado desc);
alter table public.club_config enable row level security;
alter table public.club_socios enable row level security;
revoke all on public.club_config, public.club_socios from anon, authenticated;
grant select on public.club_config to authenticated;
grant select (id, restaurante_id, numero, nombre, correo, movil, nacimiento, condiciones, acepta_correo, acepta_movil, acepta_perfil, version_textos, origen, creado, confirmado) on public.club_socios to authenticated;
drop policy if exists club_config_ver on public.club_config;
create policy club_config_ver on public.club_config for select to authenticated using (public.es_maestro(restaurante_id));
drop policy if exists club_socios_ver on public.club_socios;
create policy club_socios_ver on public.club_socios for select to authenticated using (public.es_maestro(restaurante_id));

create or replace function public.club_abrir(p_rid uuid, p_abierto boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_maestro(p_rid) then raise exception 'Solo el usuario maestro abre o cierra el club.'; end if;
  insert into public.club_config (restaurante_id, abierto) values (p_rid, coalesce(p_abierto, false))
  on conflict (restaurante_id) do update set abierto = excluded.abierto, actualizado = now();
end $$;

create or replace function public.club_info(p_rid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('abierto', coalesce(c.abierto, false), 'local', r.nombre)
  from public.restaurantes r left join public.club_config c on c.restaurante_id = r.id where r.id = p_rid
$$;

create or replace function public.club_alta(p_rid uuid, p_nombre text, p_correo text, p_movil text, p_nacimiento date,
  p_mayor boolean, p_condiciones boolean, p_acepta_correo boolean, p_acepta_movil boolean, p_acepta_perfil boolean, p_version text, p_origen text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_clave text; v_num integer; v_correo text := lower(trim(coalesce(p_correo, ''))); v_movil text := nullif(regexp_replace(coalesce(p_movil, ''), '[^0-9+]', '', 'g'), '');
begin
  if not exists (select 1 from public.club_config where restaurante_id = p_rid and abierto) then
    return jsonb_build_object('ok', false, 'error', 'El club todavía no está abierto.'); end if;
  if length(trim(coalesce(p_nombre, ''))) not between 2 and 80 then return jsonb_build_object('ok', false, 'error', 'Escribe tu nombre.'); end if;
  if v_correo !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or length(v_correo) > 120 then return jsonb_build_object('ok', false, 'error', 'Revisa el correo.'); end if;
  if v_movil is not null and v_movil !~ '^\+?[0-9]{9,15}$' then return jsonb_build_object('ok', false, 'error', 'Revisa el móvil.'); end if;
  if coalesce(p_acepta_movil, false) and v_movil is null then return jsonb_build_object('ok', false, 'error', 'Para recibir mensajes, escribe tu móvil.'); end if;
  if not coalesce(p_mayor, false) or (p_nacimiento is not null and p_nacimiento > (current_date - interval '18 years')) then
    return jsonb_build_object('ok', false, 'error', 'El club es para mayores de 18 años.'); end if;
  if not coalesce(p_condiciones, false) then return jsonb_build_object('ok', false, 'error', 'Hay que aceptar las condiciones.'); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_rid::text, 79));
  if (select count(*) from public.club_socios where restaurante_id = p_rid and creado > now() - interval '1 hour') >= 40 then
    return jsonb_build_object('ok', false, 'error', 'Hay muchas altas ahora mismo. Prueba dentro de un rato.'); end if;
  select coalesce(max(numero), 0) + 1 into v_num from public.club_socios where restaurante_id = p_rid;
  v_clave := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.club_socios (restaurante_id, numero, nombre, correo, movil, nacimiento, condiciones, acepta_correo, acepta_movil, acepta_perfil, version_textos, origen, clave_hash)
  values (p_rid, v_num, trim(p_nombre), v_correo, v_movil, p_nacimiento, now(),
    case when p_acepta_correo then now() end, case when p_acepta_movil then now() end, case when p_acepta_perfil then now() end,
    left(coalesce(p_version, ''), 20), case when p_origen in ('mesa','redes','caja','web') then p_origen else 'web' end,
    encode(extensions.digest(convert_to(v_clave, 'UTF8'), 'sha256'), 'hex'));
  return jsonb_build_object('ok', true, 'clave', v_clave, 'numero', v_num);
end $$;

create or replace function public.club_ficha(p_clave text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('nombre', s.nombre, 'numero', s.numero, 'local', r.nombre, 'correo', s.acepta_correo is not null,
    'movil', s.acepta_movil is not null, 'perfil', s.acepta_perfil is not null, 'tiene_movil', s.movil is not null)
  from public.club_socios s join public.restaurantes r on r.id = s.restaurante_id
  where s.clave_hash = encode(extensions.digest(convert_to(coalesce(p_clave, ''), 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function public.club_preferencias(p_clave text, p_correo boolean, p_movil boolean, p_perfil boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.club_socios set
    acepta_correo = case when p_correo then coalesce(acepta_correo, now()) end,
    acepta_movil = case when p_movil and movil is not null then coalesce(acepta_movil, now()) end,
    acepta_perfil = case when p_perfil then coalesce(acepta_perfil, now()) end
    where clave_hash = encode(extensions.digest(convert_to(coalesce(p_clave, ''), 'UTF8'), 'sha256'), 'hex');
  return found;
end $$;

-- Darse de baja borra los datos
create or replace function public.club_baja(p_clave text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from public.club_socios where clave_hash = encode(extensions.digest(convert_to(coalesce(p_clave, ''), 'UTF8'), 'sha256'), 'hex');
  return found;
end $$;

revoke execute on function public.club_abrir(uuid, boolean), public.club_info(uuid),
  public.club_alta(uuid, text, text, text, date, boolean, boolean, boolean, boolean, boolean, text, text),
  public.club_ficha(text), public.club_preferencias(text, boolean, boolean, boolean), public.club_baja(text) from public, anon, authenticated;
grant execute on function public.club_abrir(uuid, boolean) to authenticated;
grant execute on function public.club_info(uuid), public.club_alta(uuid, text, text, text, date, boolean, boolean, boolean, boolean, boolean, text, text),
  public.club_ficha(text), public.club_preferencias(text, boolean, boolean, boolean), public.club_baja(text) to anon, authenticated;
