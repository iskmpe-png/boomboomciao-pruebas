-- =====================================================================
-- 010 · Área de sala, usuario maestro, fichaje con QR y tablet del local
-- Se puede ejecutar más de una vez sin perder datos.
-- Reglas de la casa:
--   · Un fichaje no se modifica ni se borra, tampoco por el usuario maestro.
--   · Una corrección es un apunte nuevo, con autor y motivo, que la otra parte acepta o discute.
--   · La hora la pone el servidor. La tablet no es una cuenta: solo tiene una clave para enseñar el código.
-- =====================================================================

-- 1. Área de sala y permiso de maestro -------------------------------
alter table public.miembros drop constraint if exists miembros_area_check;
alter table public.miembros add constraint miembros_area_check check (area in ('todas','cocina','barra','sala'));
alter table public.miembros add column if not exists maestro boolean not null default false;

create or replace function public.area_de_doc(p_col text, p_id text, p_data jsonb) returns text
language sql immutable set search_path = public as $$
  select case
    when p_col in ('productos', 'platos') then case when p_data ->> 'area' = 'barra' then 'barra' else 'cocina' end
    when p_col = 'turnos' then case when p_id like 'barra-%' then 'barra' when p_id like 'sala-%' then 'sala' else 'cocina' end
    else null end
$$;

create or replace function public.aprobar_miembro(p_rid uuid, p_user uuid, p_rol text, p_area text) returns void
language plpgsql security definer set search_path = public as $$
declare v_mio text; v_mi_area text; v_est text;
begin
  select rol, area into v_mio, v_mi_area from public.miembros
    where restaurante_id = p_rid and user_id = auth.uid() and estado = 'activo';
  if v_mio is null or not (v_mio = 'dueno' or (v_mio = 'encargado' and v_mi_area = 'todas')) then
    raise exception 'Solo el dueño puede aprobar a personas nuevas.';
  end if;
  if p_rol not in ('dueno', 'encargado', 'cocina', 'consulta') then raise exception 'Ese rol no existe.'; end if;
  if p_area not in ('todas', 'cocina', 'barra', 'sala') then raise exception 'Esa área no existe.'; end if;
  if v_mio = 'encargado' and p_rol in ('dueno', 'encargado') then raise exception 'Solo el dueño puede dar ese rol.'; end if;
  select estado into v_est from public.miembros where restaurante_id = p_rid and user_id = p_user;
  if v_est is null then raise exception 'Esa solicitud ya no existe.'; end if;
  update public.miembros set rol = p_rol, area = p_area, estado = 'activo'
    where restaurante_id = p_rid and user_id = p_user;
end $$;

create or replace function public.cambiar_area(p_rid uuid, p_user uuid, p_area text) returns void
language plpgsql security definer set search_path = public as $$
declare v_mio text; v_mi_area text; v_suyo text;
begin
  select rol, area into v_mio, v_mi_area from public.miembros where restaurante_id = p_rid and user_id = auth.uid() and estado = 'activo';
  if v_mio is null or not (v_mio = 'dueno' or (v_mio = 'encargado' and v_mi_area = 'todas')) then
    raise exception 'Solo el dueño puede cambiar el área de una persona.';
  end if;
  if p_area not in ('todas', 'cocina', 'barra', 'sala') then raise exception 'Esa área no existe.'; end if;
  if p_user = auth.uid() then raise exception 'No puedes cambiar tu propia área.'; end if;
  select rol into v_suyo from public.miembros where restaurante_id = p_rid and user_id = p_user;
  if v_suyo is null then raise exception 'Esa persona no está en este restaurante.'; end if;
  if v_mio = 'encargado' and v_suyo in ('dueno', 'encargado') then raise exception 'Solo el dueño puede hacer ese cambio.'; end if;
  update public.miembros set area = p_area where restaurante_id = p_rid and user_id = p_user;
end $$;

create or replace function public.es_maestro(p_rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.miembros
    where restaurante_id = p_rid and user_id = auth.uid() and estado = 'activo' and (rol = 'dueno' or maestro))
$$;

create or replace function public.poner_maestro(p_rid uuid, p_user uuid, p_valor boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.rol_en(p_rid) is distinct from 'dueno' then raise exception 'Solo el dueño nombra usuarios maestros.'; end if;
  update public.miembros set maestro = coalesce(p_valor, false)
    where restaurante_id = p_rid and user_id = p_user and estado = 'activo';
  if not found then raise exception 'Esa persona no está en este restaurante.'; end if;
end $$;

-- ¿Puede quien llama ver los datos de jornada de esa persona?
create or replace function public.ve_jornada(p_rid uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.miembros yo
    where yo.restaurante_id = p_rid and yo.user_id = auth.uid() and yo.estado = 'activo'
      and (p_user = auth.uid() or yo.rol = 'dueno' or yo.maestro
        or (yo.rol = 'encargado' and (yo.area = 'todas' or yo.area = (
          select p.area from public.miembros p where p.restaurante_id = p_rid and p.user_id = p_user))))
  )
$$;

-- 2. Tablas -----------------------------------------------------------
create table if not exists public.quioscos (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  nombre text not null,
  clave_hash text not null unique,
  secreto bytea not null,
  activo boolean not null default true,
  creado timestamptz not null default now(),
  creado_por uuid,
  visto timestamptz
);

create table if not exists public.fichajes (
  id bigint generated always as identity primary key,
  restaurante_id uuid not null references public.restaurantes(id) on delete restrict,
  user_id uuid not null,
  nombre text not null default '',
  area text not null default 'todas',
  tipo text not null check (tipo in ('entrada','pausa','vuelta','salida','anula')),
  momento timestamptz not null,
  registrado timestamptz not null default now(),
  modo text not null check (modo in ('presencial','distancia')),
  medio text not null check (medio in ('qr','codigo','pin','boton','correccion')),
  quiosco_id uuid,
  franja bigint,
  corrige bigint references public.fichajes(id),
  motivo text,
  autor uuid not null,
  n bigint not null default 0,
  huella_ant text not null default '',
  huella text not null default '',
  unique (restaurante_id, n)
);
create index if not exists fichajes_persona on public.fichajes (restaurante_id, user_id, momento);
create index if not exists fichajes_corrige on public.fichajes (corrige) where corrige is not null;

create table if not exists public.fichajes_respuestas (
  fichaje_id bigint primary key references public.fichajes(id),
  user_id uuid not null,
  acepta boolean not null,
  comentario text,
  momento timestamptz not null default now()
);

create table if not exists public.jornadas_plan (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  user_id uuid not null,
  fecha date not null,
  inicio time not null,
  fin time not null,
  modo text not null check (modo in ('presencial','distancia')),
  nota text,
  creado_por uuid not null default auth.uid(),
  creado timestamptz not null default now(),
  unique (restaurante_id, user_id, fecha, inicio)
);

create table if not exists public.fichaje_pin (
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  user_id uuid not null,
  hash text not null,
  fallos integer not null default 0,
  bloqueado timestamptz,
  primary key (restaurante_id, user_id)
);

create table if not exists public.fichaje_intentos (
  id bigint generated always as identity primary key,
  user_id uuid,
  quiosco_id uuid,
  t timestamptz not null default now()
);

-- 3. Registro encadenado e inalterable --------------------------------
create or replace function public.fichaje_texto(f public.fichajes) returns text
language sql stable set search_path = public as $$
  select concat_ws('|', f.huella_ant, f.n, f.restaurante_id, f.user_id, f.tipo,
    to_char(f.momento at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
    to_char(f.registrado at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
    f.modo, f.medio, coalesce(f.corrige::text, ''), coalesce(f.motivo, ''), f.autor)
$$;

create or replace function public.fichaje_sellar() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_n bigint; v_h text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.restaurante_id::text, 77));
  select n, huella into v_n, v_h from public.fichajes where restaurante_id = new.restaurante_id order by n desc limit 1;
  new.n := coalesce(v_n, 0) + 1;
  new.huella_ant := coalesce(v_h, '');
  new.registrado := clock_timestamp();
  new.huella := encode(extensions.digest(convert_to(public.fichaje_texto(new), 'UTF8'), 'sha256'), 'hex');
  return new;
end $$;

create or replace function public.solo_altas() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'El registro de jornada no se puede modificar ni borrar. Se corrige con un apunte nuevo.' using errcode = '42501';
end $$;

drop trigger if exists fichaje_sellar on public.fichajes;
create trigger fichaje_sellar before insert on public.fichajes for each row execute function public.fichaje_sellar();
drop trigger if exists fichaje_inalterable on public.fichajes;
create trigger fichaje_inalterable before update or delete on public.fichajes for each row execute function public.solo_altas();
drop trigger if exists fichaje_sin_vaciar on public.fichajes;
create trigger fichaje_sin_vaciar before truncate on public.fichajes for each statement execute function public.solo_altas();
drop trigger if exists respuesta_inalterable on public.fichajes_respuestas;
create trigger respuesta_inalterable before update or delete on public.fichajes_respuestas for each row execute function public.solo_altas();

-- Recorre la cadena y devuelve el primer apunte que no cuadra (nulo = todo bien)
create or replace function public.fichajes_comprobar(p_rid uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.fichajes; v_ant text := ''; v_n bigint := 0;
begin
  if not public.es_maestro(p_rid) then raise exception 'Solo el usuario maestro puede comprobar el registro.'; end if;
  for r in select * from public.fichajes where restaurante_id = p_rid order by n loop
    v_n := v_n + 1;
    if r.n <> v_n or r.huella_ant <> v_ant
       or r.huella <> encode(extensions.digest(convert_to(public.fichaje_texto(r), 'UTF8'), 'sha256'), 'hex') then
      return jsonb_build_object('ok', false, 'apunte', r.n, 'total', v_n);
    end if;
    v_ant := r.huella;
  end loop;
  return jsonb_build_object('ok', true, 'total', v_n, 'ultima_huella', v_ant);
end $$;

-- 4. Estado de cada persona -------------------------------------------
-- Apuntes que cuentan: los normales y las correcciones aceptadas, sin los que otra corrección aceptada sustituye o anula
create or replace function public.fichajes_efectivos(p_rid uuid, p_user uuid) returns setof public.fichajes
language sql stable security definer set search_path = public as $$
  select f.* from public.fichajes f
  where f.restaurante_id = p_rid and f.user_id = p_user and f.tipo <> 'anula'
    and (f.medio <> 'correccion' or exists (select 1 from public.fichajes_respuestas r where r.fichaje_id = f.id and r.acepta))
    and not exists (select 1 from public.fichajes c join public.fichajes_respuestas r on r.fichaje_id = c.id and r.acepta where c.corrige = f.id)
$$;

-- fuera / dentro / pausa. Una entrada sin salida de hace más de 16 horas ya no cuenta como «dentro»
create or replace function public.fichaje_estado(p_rid uuid, p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u public.fichajes; e public.fichajes; v text;
begin
  select * into u from public.fichajes_efectivos(p_rid, p_user)
    where momento > now() - interval '16 hours' and momento <= now() + interval '1 minute'
    order by momento desc, id desc limit 1;
  v := case when u.tipo in ('entrada','vuelta') then 'dentro' when u.tipo = 'pausa' then 'pausa' else 'fuera' end;
  if v <> 'fuera' then
    select * into e from public.fichajes_efectivos(p_rid, p_user) where tipo = 'entrada' and momento <= u.momento order by momento desc, id desc limit 1;
  end if;
  return jsonb_build_object('estado', v, 'desde', e.momento, 'modo', coalesce(e.modo, u.modo), 'ultimo', u.momento);
end $$;

create or replace function public.fichaje_paso_valido(p_estado text, p_tipo text) returns boolean
language sql immutable set search_path = public as $$
  select (p_estado = 'fuera' and p_tipo = 'entrada')
      or (p_estado = 'dentro' and p_tipo in ('pausa','salida'))
      or (p_estado = 'pausa' and p_tipo in ('vuelta','salida'))
$$;

create or replace function public.fichaje_apuntar(p_rid uuid, p_user uuid, p_tipo text, p_momento timestamptz, p_modo text,
  p_medio text, p_quiosco uuid, p_franja bigint, p_corrige bigint, p_motivo text, p_autor uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_nom text; v_area text;
begin
  select nombre, area into v_nom, v_area from public.miembros where restaurante_id = p_rid and user_id = p_user;
  if v_nom is null then
    select nombre, area into v_nom, v_area from public.fichajes where restaurante_id = p_rid and user_id = p_user order by n desc limit 1;
  end if;
  insert into public.fichajes (restaurante_id, user_id, nombre, area, tipo, momento, modo, medio, quiosco_id, franja, corrige, motivo, autor)
  values (p_rid, p_user, coalesce(v_nom, ''), coalesce(v_area, 'todas'), p_tipo, p_momento, p_modo, p_medio, p_quiosco, p_franja, p_corrige, p_motivo, p_autor)
  returning id into v_id;
  return v_id;
end $$;

-- 5. Códigos de la tablet: cambian cada 30 segundos --------------------
create or replace function public.quiosco_codigos(p_quiosco uuid, p_secreto bytea, p_franja bigint,
  out codigo text, out qr text)
language plpgsql immutable set search_path = public as $$
declare h text;
begin
  h := encode(extensions.hmac(convert_to(p_franja::text, 'UTF8'), p_secreto, 'sha256'), 'hex');
  codigo := lpad(((('x' || substr(h, 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0');
  qr := 'BBC1.' || replace(p_quiosco::text, '-', '') || '.' || p_franja || '.' || substr(h, 9, 24);
end $$;

create or replace function public.quiosco_crear(p_rid uuid, p_nombre text) returns text
language plpgsql security definer set search_path = public as $$
declare v_clave text;
begin
  if not public.es_maestro(p_rid) then raise exception 'Solo el usuario maestro puede preparar una tablet de fichaje.'; end if;
  if (select count(*) from public.quioscos where restaurante_id = p_rid and activo) >= 5 then
    raise exception 'Ya hay 5 tablets activas. Quita alguna antes.'; end if;
  v_clave := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.quioscos (restaurante_id, nombre, clave_hash, secreto, creado_por)
  values (p_rid, left(coalesce(nullif(trim(p_nombre), ''), 'Tablet'), 40),
    encode(extensions.digest(convert_to(v_clave, 'UTF8'), 'sha256'), 'hex'), extensions.gen_random_bytes(32), auth.uid());
  return v_clave;
end $$;

create or replace function public.quiosco_quitar(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_rid uuid;
begin
  select restaurante_id into v_rid from public.quioscos where id = p_id;
  if v_rid is null or not public.es_maestro(v_rid) then raise exception 'No puedes quitar esa tablet.'; end if;
  update public.quioscos set activo = false where id = p_id;
end $$;

create or replace function public.quioscos_lista(p_rid uuid) returns table(id uuid, nombre text, creado timestamptz, visto timestamptz)
language sql stable security definer set search_path = public as $$
  select q.id, q.nombre, q.creado, q.visto from public.quioscos q
  where q.restaurante_id = p_rid and q.activo and public.es_maestro(p_rid) order by q.creado
$$;

create or replace function public.quiosco_de_clave(p_clave text) returns public.quioscos
language sql stable security definer set search_path = public as $$
  select q.* from public.quioscos q
  where q.activo and q.clave_hash = encode(extensions.digest(convert_to(coalesce(p_clave, ''), 'UTF8'), 'sha256'), 'hex')
$$;

-- Lo que enseña la tablet: código, quién está dentro y la lista para fichar sin móvil
create or replace function public.quiosco_estado(p_clave text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q public.quioscos; v_franja bigint; c record; v_personas jsonb;
begin
  q := public.quiosco_de_clave(p_clave);
  if q.id is null then return jsonb_build_object('ok', false, 'error', 'Esta tablet ya no está autorizada.'); end if;
  update public.quioscos set visto = now() where id = q.id and (visto is null or visto < now() - interval '1 minute');
  v_franja := floor(extract(epoch from now()) / 30);
  select * into c from public.quiosco_codigos(q.id, q.secreto, v_franja);
  select coalesce(jsonb_agg(jsonb_build_object('id', m.user_id, 'nombre', m.nombre, 'area', m.area,
           'pin', p.user_id is not null, 'estado', e.j ->> 'estado', 'desde', e.j ->> 'desde', 'modo', e.j ->> 'modo') order by m.nombre), '[]')
    into v_personas
    from public.miembros m
    left join public.fichaje_pin p on p.restaurante_id = m.restaurante_id and p.user_id = m.user_id
    cross join lateral (select public.fichaje_estado(m.restaurante_id, m.user_id) as j) e
    where m.restaurante_id = q.restaurante_id and m.estado = 'activo';
  return jsonb_build_object('ok', true, 'quiosco', q.nombre,
    'local', (select nombre from public.restaurantes where id = q.restaurante_id),
    'ahora', now(), 'quedan', 30 - mod(floor(extract(epoch from now()))::bigint, 30),
    'codigo', c.codigo, 'qr', c.qr, 'personas', v_personas);
end $$;

-- 6. Fichar ------------------------------------------------------------
create or replace function public.fichar(p_rid uuid, p_tipo text, p_codigo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_est jsonb; v_cod text; v_franja bigint; v_q uuid; v_f bigint; v_medio text; v_modo text; r record; c record; k bigint;
begin
  if v_uid is null or public.rol_en(p_rid) is null then raise exception 'No tienes acceso a este restaurante.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_rid::text || v_uid::text, 78));
  v_est := public.fichaje_estado(p_rid, v_uid);
  if not coalesce(public.fichaje_paso_valido(v_est ->> 'estado', p_tipo), false) then
    return jsonb_build_object('ok', false, 'error', case v_est ->> 'estado'
      when 'fuera' then 'Ahora no estás dentro: primero ficha la entrada.'
      when 'pausa' then 'Estás en pausa: ficha la vuelta o la salida.'
      else 'Ya estás dentro: puedes fichar pausa o salida.' end);
  end if;
  v_cod := regexp_replace(coalesce(p_codigo, ''), '\s', '', 'g');
  if v_cod = '' then
    -- Sin código solo se ficha a distancia, y solo si el usuario maestro lo ha programado
    if p_tipo = 'entrada' then
      if not exists (select 1 from public.jornadas_plan where restaurante_id = p_rid and user_id = v_uid
                     and fecha = (now() at time zone 'Europe/Madrid')::date and modo = 'distancia') then
        return jsonb_build_object('ok', false, 'error', 'En el local hay que escanear el código de la tablet. Para fichar sin código, el usuario maestro tiene que ponerte hoy horas de teletrabajo.');
      end if;
    elsif v_est ->> 'modo' is distinct from 'distancia' then
      return jsonb_build_object('ok', false, 'error', 'Este turno es presencial: escanea el código de la tablet.');
    end if;
    v_medio := 'boton'; v_modo := 'distancia';
  else
    if (select count(*) from public.fichaje_intentos where user_id = v_uid and t > now() - interval '10 minutes') >= 8 then
      return jsonb_build_object('ok', false, 'error', 'Demasiados códigos erróneos. Espera 10 minutos o ficha en la tablet con tu PIN.');
    end if;
    k := floor(extract(epoch from now()) / 30);
    for r in select * from public.quioscos where restaurante_id = p_rid and activo loop
      foreach v_f in array array[k, k - 1] loop
        select * into c from public.quiosco_codigos(r.id, r.secreto, v_f);
        if v_cod = c.qr or v_cod = c.codigo then
          v_q := r.id; v_franja := v_f; v_medio := case when v_cod = c.qr then 'qr' else 'codigo' end;
        end if;
        exit when v_q is not null;
      end loop;
      exit when v_q is not null;
    end loop;
    if v_q is null then
      insert into public.fichaje_intentos (user_id) values (v_uid);
      return jsonb_build_object('ok', false, 'error', 'El código no vale o ya ha caducado. Mira la tablet y prueba otra vez.');
    end if;
    if exists (select 1 from public.fichajes where restaurante_id = p_rid and user_id = v_uid and quiosco_id = v_q and franja = v_franja) then
      return jsonb_build_object('ok', false, 'error', 'Ese código ya lo has usado. Espera a que cambie.');
    end if;
    v_modo := 'presencial';
  end if;
  perform public.fichaje_apuntar(p_rid, v_uid, p_tipo, clock_timestamp(), v_modo, v_medio, v_q, v_franja, null, null, v_uid);
  return jsonb_build_object('ok', true, 'estado', public.fichaje_estado(p_rid, v_uid));
end $$;

-- Sin móvil propio: se ficha en la tablet con un PIN personal
create or replace function public.quiosco_fichar(p_clave text, p_user uuid, p_pin text, p_tipo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q public.quioscos; p public.fichaje_pin; v_est jsonb;
begin
  q := public.quiosco_de_clave(p_clave);
  if q.id is null then return jsonb_build_object('ok', false, 'error', 'Esta tablet ya no está autorizada.'); end if;
  if (select count(*) from public.fichaje_intentos where quiosco_id = q.id and t > now() - interval '10 minutes') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'Demasiados intentos en esta tablet. Espera 10 minutos.');
  end if;
  if not exists (select 1 from public.miembros where restaurante_id = q.restaurante_id and user_id = p_user and estado = 'activo') then
    return jsonb_build_object('ok', false, 'error', 'Esa persona no está en este local.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(q.restaurante_id::text || p_user::text, 78));
  select * into p from public.fichaje_pin where restaurante_id = q.restaurante_id and user_id = p_user for update;
  if p.user_id is null then return jsonb_build_object('ok', false, 'error', 'Aún no tienes PIN. Créalo en la app (Fichar) o pídeselo a dirección.'); end if;
  if p.bloqueado > now() then return jsonb_build_object('ok', false, 'error', 'PIN bloqueado unos minutos por varios fallos.'); end if;
  if p.hash <> extensions.crypt(coalesce(p_pin, ''), p.hash) then
    update public.fichaje_pin set fallos = case when fallos >= 4 then 0 else fallos + 1 end,
      bloqueado = case when fallos >= 4 then now() + interval '10 minutes' else bloqueado end
      where restaurante_id = q.restaurante_id and user_id = p_user;
    insert into public.fichaje_intentos (quiosco_id) values (q.id);
    return jsonb_build_object('ok', false, 'error', 'PIN incorrecto.');
  end if;
  update public.fichaje_pin set fallos = 0, bloqueado = null where restaurante_id = q.restaurante_id and user_id = p_user;
  v_est := public.fichaje_estado(q.restaurante_id, p_user);
  if not coalesce(public.fichaje_paso_valido(v_est ->> 'estado', p_tipo), false) then
    return jsonb_build_object('ok', false, 'error', 'Ese paso no toca ahora.');
  end if;
  perform public.fichaje_apuntar(q.restaurante_id, p_user, p_tipo, clock_timestamp(), 'presencial', 'pin', q.id, null, null, null, p_user);
  return jsonb_build_object('ok', true, 'estado', public.fichaje_estado(q.restaurante_id, p_user));
end $$;

create or replace function public.poner_pin(p_rid uuid, p_user uuid, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.rol_en(p_rid) is null or not (p_user = auth.uid() or public.es_maestro(p_rid)) then
    raise exception 'No puedes cambiar ese PIN.'; end if;
  if not exists (select 1 from public.miembros where restaurante_id = p_rid and user_id = p_user and estado = 'activo') then
    raise exception 'Esa persona no está en este restaurante.'; end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4,8}$' then raise exception 'El PIN son entre 4 y 8 números.'; end if;
  if p_pin ~ '^(\d)\1+$' or p_pin in ('1234','12345','123456','4321') then raise exception 'Ese PIN es demasiado fácil.'; end if;
  insert into public.fichaje_pin (restaurante_id, user_id, hash) values (p_rid, p_user, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)))
  on conflict (restaurante_id, user_id) do update set hash = excluded.hash, fallos = 0, bloqueado = null;
end $$;

-- 7. Correcciones -------------------------------------------------------
create or replace function public.proponer_correccion(p_rid uuid, p_user uuid, p_tipo text, p_momento timestamptz, p_motivo text, p_corrige bigint default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare o public.fichajes; v_momento timestamptz := p_momento; v_modo text := 'presencial';
begin
  if public.rol_en(p_rid) is null or not public.ve_jornada(p_rid, p_user) then raise exception 'No puedes corregir la jornada de esa persona.'; end if;
  if p_tipo not in ('entrada','pausa','vuelta','salida','anula') then raise exception 'Ese tipo de apunte no existe.'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then raise exception 'Explica el motivo de la corrección.'; end if;
  if p_corrige is not null then
    select * into o from public.fichajes where id = p_corrige and restaurante_id = p_rid and user_id = p_user;
    if o.id is null then raise exception 'No encuentro el apunte que quieres corregir.'; end if;
    v_modo := o.modo;
  end if;
  if p_tipo = 'anula' then
    if o.id is null then raise exception 'Elige el apunte que sobra.'; end if;
    v_momento := o.momento;
  end if;
  if v_momento is null or v_momento > now() + interval '5 minutes' or v_momento < now() - interval '4 years' then
    raise exception 'La fecha y la hora no son válidas.'; end if;
  if not exists (select 1 from public.miembros where restaurante_id = p_rid and user_id = p_user)
     and not exists (select 1 from public.fichajes where restaurante_id = p_rid and user_id = p_user) then
    raise exception 'Esa persona no está en este restaurante.'; end if;
  return public.fichaje_apuntar(p_rid, p_user, p_tipo, v_momento, v_modo, 'correccion', null, null, p_corrige, left(trim(p_motivo), 300), auth.uid());
end $$;

create or replace function public.responder_correccion(p_id bigint, p_acepta boolean, p_comentario text default null) returns void
language plpgsql security definer set search_path = public as $$
declare f public.fichajes;
begin
  select * into f from public.fichajes where id = p_id and medio = 'correccion';
  if f.id is null or public.rol_en(f.restaurante_id) is null then raise exception 'Esa corrección no existe.'; end if;
  -- Responde la otra parte: si la propuso la persona, dirección o su encargado; si la propuso otro, la persona
  if f.autor = f.user_id then
    if auth.uid() = f.user_id or not public.ve_jornada(f.restaurante_id, f.user_id) then raise exception 'Esta corrección la tiene que revisar dirección o el encargado.'; end if;
  elsif auth.uid() <> f.user_id then
    raise exception 'Solo la persona afectada puede aceptar o discutir esta corrección.';
  end if;
  insert into public.fichajes_respuestas (fichaje_id, user_id, acepta, comentario)
  values (p_id, auth.uid(), coalesce(p_acepta, false), left(nullif(trim(coalesce(p_comentario, '')), ''), 300));
exception when unique_violation then
  raise exception 'Esa corrección ya estaba respondida.';
end $$;

-- 8. Reglas de acceso ---------------------------------------------------
alter table public.quioscos enable row level security;
alter table public.fichajes enable row level security;
alter table public.fichajes_respuestas enable row level security;
alter table public.jornadas_plan enable row level security;
alter table public.fichaje_pin enable row level security;
alter table public.fichaje_intentos enable row level security;

revoke all on public.quioscos, public.fichajes, public.fichajes_respuestas, public.jornadas_plan, public.fichaje_pin, public.fichaje_intentos from anon, authenticated;
grant select on public.fichajes, public.fichajes_respuestas to authenticated;
grant select, insert, delete on public.jornadas_plan to authenticated;

drop policy if exists fichajes_ver on public.fichajes;
create policy fichajes_ver on public.fichajes for select to authenticated
  using (public.ve_jornada(restaurante_id, user_id));
drop policy if exists respuestas_ver on public.fichajes_respuestas;
create policy respuestas_ver on public.fichajes_respuestas for select to authenticated
  using (exists (select 1 from public.fichajes f where f.id = fichaje_id));
drop policy if exists plan_ver on public.jornadas_plan;
create policy plan_ver on public.jornadas_plan for select to authenticated
  using (public.ve_jornada(restaurante_id, user_id));
drop policy if exists plan_crear on public.jornadas_plan;
create policy plan_crear on public.jornadas_plan for insert to authenticated
  with check (public.es_maestro(restaurante_id) and creado_por = (select auth.uid()));
drop policy if exists plan_borrar on public.jornadas_plan;
create policy plan_borrar on public.jornadas_plan for delete to authenticated
  using (public.es_maestro(restaurante_id));

-- Permisos de las funciones: primero se quitan todos y luego se dan solo los necesarios
revoke execute on function
  public.es_maestro(uuid), public.poner_maestro(uuid, uuid, boolean), public.ve_jornada(uuid, uuid),
  public.fichaje_texto(public.fichajes), public.fichaje_sellar(), public.solo_altas(), public.fichajes_comprobar(uuid),
  public.fichajes_efectivos(uuid, uuid), public.fichaje_estado(uuid, uuid), public.fichaje_paso_valido(text, text),
  public.fichaje_apuntar(uuid, uuid, text, timestamptz, text, text, uuid, bigint, bigint, text, uuid),
  public.quiosco_codigos(uuid, bytea, bigint), public.quiosco_crear(uuid, text), public.quiosco_quitar(uuid), public.quioscos_lista(uuid),
  public.quiosco_de_clave(text), public.quiosco_estado(text), public.fichar(uuid, text, text), public.quiosco_fichar(text, uuid, text, text),
  public.poner_pin(uuid, uuid, text), public.proponer_correccion(uuid, uuid, text, timestamptz, text, bigint),
  public.responder_correccion(bigint, boolean, text)
from public, anon, authenticated;
grant execute on function
  public.es_maestro(uuid), public.poner_maestro(uuid, uuid, boolean), public.ve_jornada(uuid, uuid), public.fichajes_comprobar(uuid),
  public.quiosco_crear(uuid, text), public.quiosco_quitar(uuid), public.quioscos_lista(uuid), public.fichar(uuid, text, text),
  public.poner_pin(uuid, uuid, text), public.proponer_correccion(uuid, uuid, text, timestamptz, text, bigint),
  public.responder_correccion(bigint, boolean, text), public.quiosco_estado(text), public.quiosco_fichar(text, uuid, text, text)
to authenticated;
grant execute on function public.quiosco_estado(text), public.quiosco_fichar(text, uuid, text, text) to anon;

-- Estado propio (para la portada «Hoy»)
create or replace function public.mi_fichaje(p_rid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.rol_en(p_rid) is null then null else
    public.fichaje_estado(p_rid, auth.uid()) || jsonb_build_object('pin',
      exists (select 1 from public.fichaje_pin where restaurante_id = p_rid and user_id = auth.uid())) end
$$;
revoke execute on function public.mi_fichaje(uuid) from public, anon;
grant execute on function public.mi_fichaje(uuid) to authenticated;
