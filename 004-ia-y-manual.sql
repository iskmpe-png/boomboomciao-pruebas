-- =====================================================================
-- Boom Boom Ciao · base de datos, parte 4: límite de IA y manual de la casa
-- Pega todo este texto en Supabase > SQL Editor > New query y pulsa Run.
-- Se puede ejecutar más de una vez. No toca los datos que ya tienes.
-- =====================================================================

-- 1. Límite de consultas a la IA por restaurante y día ------------------
alter table public.restaurantes add column if not exists limite_ia integer not null default 200;

create table if not exists public.uso_ia (
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  dia date not null,
  llamadas integer not null default 0,
  primary key (restaurante_id, dia)
);
alter table public.uso_ia enable row level security;

drop policy if exists uso_ia_ver on public.uso_ia;
create policy uso_ia_ver on public.uso_ia for select to authenticated
  using (public.rol_en(restaurante_id) in ('dueno','encargado'));

-- La llama el servidor de IA antes de cada consulta: suma una y dice si
-- todavía queda cupo hoy. Solo cuenta para miembros del restaurante.
create or replace function public.contar_ia(p_rid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_dia date := (now() at time zone 'Europe/Madrid')::date; v_n integer; v_lim integer;
begin
  if public.rol_en(p_rid) is null then return false; end if;
  select limite_ia into v_lim from public.restaurantes where id = p_rid;
  select llamadas into v_n from public.uso_ia where restaurante_id = p_rid and dia = v_dia;
  if coalesce(v_n, 0) >= coalesce(v_lim, 200) then return false; end if;
  insert into public.uso_ia (restaurante_id, dia, llamadas) values (p_rid, v_dia, 1)
    on conflict (restaurante_id, dia) do update set llamadas = public.uso_ia.llamadas + 1;
  delete from public.uso_ia where restaurante_id = p_rid and dia < v_dia - 400;
  return true;
end $$;

-- Resumen para la pantalla de usuarios (dueño y encargado).
create or replace function public.uso_ia_resumen(p_rid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_dia date := (now() at time zone 'Europe/Madrid')::date;
begin
  if public.rol_en(p_rid) is null or public.rol_en(p_rid) not in ('dueno','encargado') then
    raise exception 'No tienes permiso para ver el uso de la IA.';
  end if;
  return jsonb_build_object(
    'hoy', coalesce((select llamadas from public.uso_ia where restaurante_id = p_rid and dia = v_dia), 0),
    'mes', coalesce((select sum(llamadas) from public.uso_ia where restaurante_id = p_rid and dia >= date_trunc('month', v_dia)::date), 0),
    'limite', (select limite_ia from public.restaurantes where id = p_rid)
  );
end $$;

-- Cambiar el límite: solo el administrador de la plataforma (quien paga la IA).
create or replace function public.poner_limite_ia(p_rid uuid, p_limite integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.soy_plataforma() then raise exception 'Solo el administrador de la plataforma puede cambiar el límite.'; end if;
  if p_limite is null or p_limite < 0 or p_limite > 5000 then raise exception 'El límite debe estar entre 0 y 5000.'; end if;
  update public.restaurantes set limite_ia = p_limite where id = p_rid;
end $$;

revoke all on public.uso_ia from anon, authenticated;
grant select on public.uso_ia to authenticated;
revoke execute on function public.contar_ia(uuid), public.uso_ia_resumen(uuid), public.poner_limite_ia(uuid, integer) from public, anon;
grant execute on function public.contar_ia(uuid), public.uso_ia_resumen(uuid), public.poner_limite_ia(uuid, integer) to authenticated;

-- 2. Manual de la casa y preguntas del equipo ---------------------------
-- Cocina puede apuntar preguntas sin respuesta («dudas»); el manual solo
-- lo escriben dueño y encargado.
create or replace function public.puede_escribir(p_rid uuid, p_col text) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.rol_en(p_rid)
    when 'dueno' then true
    when 'encargado' then true
    when 'cocina' then p_col in ('inventarios','mermas','compras','appcc','planes','dudas')
    else false end
$$;
