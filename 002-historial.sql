-- =====================================================================
-- Boom Boom Ciao · base de datos, parte 2: historial de cambios
-- Pega todo este texto en Supabase > SQL Editor > New query y pulsa Run.
-- Se puede ejecutar más de una vez. No toca los datos que ya tienes.
-- =====================================================================

-- 1. Tabla del historial ----------------------------------------------
-- La rellena la propia base de datos cada vez que alguien crea, cambia
-- o elimina algo. Nadie puede escribir ni borrar aquí desde la app.
create table if not exists public.historial (
  id bigint generated always as identity primary key,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  col text not null,
  doc_id text not null,
  accion text not null check (accion in ('alta','cambio','baja','restaurado')),
  antes jsonb,
  despues jsonb,
  user_id uuid,
  nombre text not null default '',
  creado timestamptz not null default now()
);
create index if not exists historial_reciente on public.historial (restaurante_id, id desc);
create index if not exists historial_doc on public.historial (restaurante_id, col, doc_id, id desc);

alter table public.historial enable row level security;

-- 2. Registro automático ----------------------------------------------
-- Los cambios seguidos de la misma persona sobre lo mismo (por ejemplo,
-- mientras escribe) se juntan en una sola línea: valor de antes y valor final.
create or replace function public.docs_historial() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_acc text; v_antes jsonb; v_despues jsonb; v_nombre text; v_id bigint; v_user uuid; v_acc_prev text;
begin
  if tg_op = 'INSERT' then
    v_acc := 'alta'; v_antes := null; v_despues := new.data;
  elsif new.borrado and not old.borrado then
    v_acc := 'baja'; v_antes := old.data; v_despues := null;
  elsif old.borrado and not new.borrado then
    v_acc := 'restaurado'; v_antes := null; v_despues := new.data;
  elsif new.data is distinct from old.data then
    v_acc := 'cambio'; v_antes := old.data; v_despues := new.data;
  else
    return null;
  end if;

  if v_acc = 'cambio' then
    select id, user_id, accion into v_id, v_user, v_acc_prev from public.historial
      where restaurante_id = new.restaurante_id and col = new.col and doc_id = new.id
      order by id desc limit 1;
    if v_id is not null and v_user is not distinct from auth.uid() and v_acc_prev in ('cambio','alta','restaurado')
       and exists (select 1 from public.historial where id = v_id and creado > now() - interval '10 minutes') then
      update public.historial set despues = v_despues, creado = clock_timestamp() where id = v_id;
      return null;
    end if;
  end if;

  select nombre into v_nombre from public.miembros
    where restaurante_id = new.restaurante_id and user_id = auth.uid();
  insert into public.historial (restaurante_id, col, doc_id, accion, antes, despues, user_id, nombre)
    values (new.restaurante_id, new.col, new.id, v_acc, v_antes, v_despues, auth.uid(), coalesce(v_nombre, ''));
  return null;
end $$;

drop trigger if exists docs_historial on public.docs;
create trigger docs_historial after insert or update on public.docs
  for each row execute function public.docs_historial();

-- 3. Quién puede verlo: solo dueño y encargado -------------------------
drop policy if exists historial_ver on public.historial;
create policy historial_ver on public.historial for select to authenticated
  using (public.rol_en(restaurante_id) in ('dueno','encargado'));

revoke all on public.historial from anon, authenticated;
grant select on public.historial to authenticated;
revoke execute on function public.docs_historial() from public, anon, authenticated;
