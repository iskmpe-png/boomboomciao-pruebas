-- =====================================================================
-- Boom Boom Ciao · base de datos (Supabase)
-- Pega todo este texto en Supabase > SQL Editor > New query y pulsa Run.
-- Se puede ejecutar más de una vez sin perder datos.
-- =====================================================================

-- 1. Tablas -----------------------------------------------------------
create table if not exists public.restaurantes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado timestamptz not null default now()
);

create table if not exists public.miembros (
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('dueno','encargado','cocina','consulta')),
  nombre text not null default '',
  email text not null default '',
  creado timestamptz not null default now(),
  primary key (restaurante_id, user_id)
);

create table if not exists public.plataforma_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Todos los datos de la app (platos, productos, inventarios, mermas...)
-- se guardan aquí, separados por restaurante.
create table if not exists public.docs (
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  col text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  borrado boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (restaurante_id, col, id)
);
create index if not exists docs_cambios on public.docs (restaurante_id, updated_at);

alter table public.restaurantes enable row level security;
alter table public.miembros enable row level security;
alter table public.plataforma_admins enable row level security;
alter table public.docs enable row level security;

-- 2. Funciones de permisos --------------------------------------------
create or replace function public.rol_en(p_rid uuid) returns text
language sql stable security definer set search_path = public as $$
  select rol from public.miembros where restaurante_id = p_rid and user_id = auth.uid()
$$;

create or replace function public.soy_plataforma() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.plataforma_admins where user_id = auth.uid())
$$;

create or replace function public.puedo_crear() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and (public.soy_plataforma() or not exists (select 1 from public.restaurantes))
$$;

-- Dueño y encargado escriben todo. Cocina solo el día a día. Consulta, nada.
create or replace function public.puede_escribir(p_rid uuid, p_col text) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.rol_en(p_rid)
    when 'dueno' then true
    when 'encargado' then true
    when 'cocina' then p_col in ('inventarios','mermas','compras','appcc','planes')
    else false end
$$;

-- 3. Sello de fecha y autor en cada cambio ----------------------------
create or replace function public.docs_sello() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists docs_sello on public.docs;
create trigger docs_sello before insert or update on public.docs
  for each row execute function public.docs_sello();

-- 4. Reglas de acceso (cada usuario solo ve su restaurante) ------------
drop policy if exists restaurantes_ver on public.restaurantes;
create policy restaurantes_ver on public.restaurantes for select to authenticated
  using (public.rol_en(id) is not null);

drop policy if exists miembros_ver on public.miembros;
create policy miembros_ver on public.miembros for select to authenticated
  using (public.rol_en(restaurante_id) is not null);

drop policy if exists docs_ver on public.docs;
create policy docs_ver on public.docs for select to authenticated
  using (public.rol_en(restaurante_id) is not null);

drop policy if exists docs_crear on public.docs;
create policy docs_crear on public.docs for insert to authenticated
  with check (public.puede_escribir(restaurante_id, col));

drop policy if exists docs_cambiar on public.docs;
create policy docs_cambiar on public.docs for update to authenticated
  using (public.puede_escribir(restaurante_id, col))
  with check (public.puede_escribir(restaurante_id, col));

-- 5. Acciones de administración ---------------------------------------
-- Crear restaurante: el primero lo crea quien llegue primero (tú) y queda
-- como administrador de la plataforma. Después, solo ese administrador.
create or replace function public.crear_restaurante(p_nombre text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nombre text; v_email text;
begin
  if auth.uid() is null then raise exception 'Entra con tu cuenta primero.'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Escribe el nombre del restaurante.'; end if;
  if not exists (select 1 from public.restaurantes) then
    insert into public.plataforma_admins (user_id) values (auth.uid()) on conflict do nothing;
  elsif not public.soy_plataforma() then
    raise exception 'Solo el administrador de la plataforma puede crear restaurantes.';
  end if;
  select coalesce(nullif(raw_user_meta_data->>'nombre', ''), split_part(email, '@', 1)), email
    into v_nombre, v_email from auth.users where id = auth.uid();
  insert into public.restaurantes (nombre) values (trim(p_nombre)) returning id into v_id;
  insert into public.miembros (restaurante_id, user_id, rol, nombre, email)
    values (v_id, auth.uid(), 'dueno', coalesce(v_nombre, ''), coalesce(v_email, ''));
  return v_id;
end $$;

-- Dar acceso a una persona que ya creó su cuenta en la app.
create or replace function public.agregar_miembro(p_rid uuid, p_email text, p_rol text) returns void
language plpgsql security definer set search_path = public as $$
declare v_mio text; v_user uuid; v_nombre text; v_email text; v_suyo text;
begin
  v_mio := public.rol_en(p_rid);
  if v_mio is null or v_mio not in ('dueno','encargado') then raise exception 'No tienes permiso para gestionar usuarios.'; end if;
  if p_rol not in ('dueno','encargado','cocina','consulta') then raise exception 'Ese rol no existe.'; end if;
  if v_mio = 'encargado' and p_rol in ('dueno','encargado') then raise exception 'Solo el dueño puede dar ese rol.'; end if;
  select id, coalesce(nullif(raw_user_meta_data->>'nombre', ''), split_part(email, '@', 1)), email
    into v_user, v_nombre, v_email from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'No hay ninguna cuenta con ese correo. Pídele que cree su cuenta en la app primero.'; end if;
  if v_user = auth.uid() then raise exception 'No puedes cambiar tu propio acceso.'; end if;
  select rol into v_suyo from public.miembros where restaurante_id = p_rid and user_id = v_user;
  if v_mio = 'encargado' and v_suyo in ('dueno','encargado') then raise exception 'Solo el dueño puede cambiar a esa persona.'; end if;
  insert into public.miembros (restaurante_id, user_id, rol, nombre, email)
    values (p_rid, v_user, p_rol, coalesce(v_nombre, ''), coalesce(v_email, ''))
    on conflict (restaurante_id, user_id) do update set rol = excluded.rol, nombre = excluded.nombre, email = excluded.email;
end $$;

create or replace function public.cambiar_rol(p_rid uuid, p_user uuid, p_rol text) returns void
language plpgsql security definer set search_path = public as $$
declare v_mio text; v_suyo text;
begin
  v_mio := public.rol_en(p_rid);
  if v_mio is null or v_mio not in ('dueno','encargado') then raise exception 'No tienes permiso para gestionar usuarios.'; end if;
  if p_rol not in ('dueno','encargado','cocina','consulta') then raise exception 'Ese rol no existe.'; end if;
  if p_user = auth.uid() then raise exception 'No puedes cambiar tu propio acceso.'; end if;
  select rol into v_suyo from public.miembros where restaurante_id = p_rid and user_id = p_user;
  if v_suyo is null then raise exception 'Esa persona no está en este restaurante.'; end if;
  if v_mio = 'encargado' and (v_suyo in ('dueno','encargado') or p_rol in ('dueno','encargado')) then
    raise exception 'Solo el dueño puede hacer ese cambio.'; end if;
  update public.miembros set rol = p_rol where restaurante_id = p_rid and user_id = p_user;
end $$;

create or replace function public.quitar_miembro(p_rid uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_mio text; v_suyo text;
begin
  v_mio := public.rol_en(p_rid);
  if v_mio is null or v_mio not in ('dueno','encargado') then raise exception 'No tienes permiso para gestionar usuarios.'; end if;
  if p_user = auth.uid() then raise exception 'No puedes quitarte a ti mismo.'; end if;
  select rol into v_suyo from public.miembros where restaurante_id = p_rid and user_id = p_user;
  if v_mio = 'encargado' and v_suyo in ('dueno','encargado') then raise exception 'Solo el dueño puede quitar a esa persona.'; end if;
  delete from public.miembros where restaurante_id = p_rid and user_id = p_user;
end $$;

-- 6. Permisos de uso --------------------------------------------------
revoke all on public.restaurantes, public.miembros, public.plataforma_admins, public.docs from anon, authenticated;
grant select on public.restaurantes, public.miembros to authenticated;
grant select, insert, update on public.docs to authenticated;

revoke execute on function public.rol_en(uuid), public.soy_plataforma(), public.puedo_crear(),
  public.puede_escribir(uuid, text), public.crear_restaurante(text), public.agregar_miembro(uuid, text, text),
  public.cambiar_rol(uuid, uuid, text), public.quitar_miembro(uuid, uuid) from public, anon;
grant execute on function public.rol_en(uuid), public.soy_plataforma(), public.puedo_crear(),
  public.puede_escribir(uuid, text), public.crear_restaurante(text), public.agregar_miembro(uuid, text, text),
  public.cambiar_rol(uuid, uuid, text), public.quitar_miembro(uuid, uuid) to authenticated;

-- 7. Avisos en tiempo real --------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; when undefined_object then null;
end $$;
