-- =====================================================================
-- Boom Boom Ciao · base de datos, parte 3: copias de seguridad diarias
-- Pega todo este texto en Supabase > SQL Editor > New query y pulsa Run.
-- Se puede ejecutar más de una vez. No toca los datos que ya tienes.
-- =====================================================================

-- 1. Tabla de copias: una por restaurante y día, se conservan 30 días ----
create table if not exists public.copias (
  id bigint generated always as identity primary key,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  dia date not null,
  datos jsonb not null,
  registros integer not null default 0,
  creado timestamptz not null default now(),
  unique (restaurante_id, dia)
);
alter table public.copias enable row level security;

-- 2. Hacer la copia de un restaurante (interna) ------------------------
create or replace function public.copia_interna(p_rid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_dia date := (now() at time zone 'Europe/Madrid')::date; v_n integer;
begin
  if exists (select 1 from public.copias where restaurante_id = p_rid and dia = v_dia) then return false; end if;
  select count(*) into v_n from public.docs where restaurante_id = p_rid and not borrado;
  if v_n = 0 then return false; end if;
  insert into public.copias (restaurante_id, dia, datos, registros)
    select p_rid, v_dia, jsonb_agg(jsonb_build_object('col', col, 'id', id, 'data', data)), v_n
    from public.docs where restaurante_id = p_rid and not borrado
    on conflict (restaurante_id, dia) do nothing;
  delete from public.copias where restaurante_id = p_rid and dia < v_dia - 30;
  return true;
end $$;

-- La app la pide una vez al día, la primera vez que alguien del restaurante entra.
create or replace function public.copia_diaria(p_rid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if public.rol_en(p_rid) is null then raise exception 'No tienes acceso a este restaurante.'; end if;
  return public.copia_interna(p_rid);
end $$;

-- Copia de todos los restaurantes (para la tarea programada).
create or replace function public.copia_todos() returns integer
language plpgsql security definer set search_path = public as $$
declare v_r record; v_n integer := 0;
begin
  for v_r in select id from public.restaurantes loop
    if public.copia_interna(v_r.id) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;

-- 3. Quién puede ver y descargar las copias: dueño y encargado ----------
drop policy if exists copias_ver on public.copias;
create policy copias_ver on public.copias for select to authenticated
  using (public.rol_en(restaurante_id) in ('dueno','encargado'));

revoke all on public.copias from anon, authenticated;
grant select on public.copias to authenticated;
revoke execute on function public.copia_interna(uuid), public.copia_todos() from public, anon, authenticated;
revoke execute on function public.copia_diaria(uuid) from public, anon;
grant execute on function public.copia_diaria(uuid) to authenticated;

-- 4. Tarea programada: copia cada madrugada aunque nadie abra la app ----
-- Si tu proyecto no tiene disponible el programador (pg_cron), este paso se
-- salta solo y la copia se hace igualmente al abrir la app cada día.
do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule('bbc-copias') where exists (select 1 from cron.job where jobname = 'bbc-copias');
  perform cron.schedule('bbc-copias', '30 3 * * *', 'select public.copia_todos()');
exception when others then
  raise notice 'Programador no disponible: la copia se hará al abrir la app. Detalle: %', sqlerrm;
end $$;

-- 5. Ajuste de seguridad recomendado por el revisor de Supabase ---------
alter function public.docs_sello() set search_path = public;
