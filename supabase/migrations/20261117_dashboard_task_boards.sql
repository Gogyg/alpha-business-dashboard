begin;

-- All signed-in Dashboard users share these boards. Only the RPCs can read or write them.
create schema if not exists dashboard_tasks_private;
revoke all on schema dashboard_tasks_private from public, anon, authenticated, service_role;

create table if not exists dashboard_tasks_private.boards (
  id text primary key,
  revision bigint not null default 1 check (revision > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null
);
alter table dashboard_tasks_private.boards enable row level security;
revoke all on table dashboard_tasks_private.boards from public, anon, authenticated, service_role;

create or replace function dashboard_tasks_private.require_user() returns uuid
language plpgsql stable set search_path = pg_catalog as $$
declare
  user_id uuid := auth.uid();
begin
  if user_id is null or not exists (
    select 1 from auth.users
    where id = user_id and deleted_at is null and (banned_until is null or banned_until <= now())
  ) then
    raise exception 'Войдите в Дашборд' using errcode = '42501';
  end if;
  return user_id;
end
$$;

create or replace function dashboard_tasks_private.clean_text(value jsonb, max_chars integer, required boolean default false)
returns text language plpgsql immutable set search_path = pg_catalog as $$
declare
  result text;
begin
  if jsonb_typeof(value) is distinct from 'string' then
    raise exception 'Ожидается текстовое поле' using errcode = '22023';
  end if;
  result := regexp_replace(value #>> '{}', '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if char_length(result) > max_chars or (required and result = '') then
    raise exception 'Проверьте длину поля' using errcode = '22023';
  end if;
  return result;
end
$$;

create or replace function dashboard_tasks_private.clean_id(value jsonb) returns text
language plpgsql immutable set search_path = pg_catalog as $$
declare
  result text := dashboard_tasks_private.clean_text(value, 80, true);
begin
  if result !~ '^[a-zA-Z0-9_-]{1,80}$' then
    raise exception 'Некорректный идентификатор' using errcode = '22023';
  end if;
  return result;
end
$$;

create or replace function dashboard_tasks_private.require_array(value jsonb, max_length integer) returns void
language plpgsql immutable set search_path = pg_catalog as $$
begin
  if jsonb_typeof(value) is distinct from 'array' then
    raise exception 'Ожидается список' using errcode = '22023';
  end if;
  if jsonb_array_length(value) > max_length then
    raise exception 'Недопустимое количество записей' using errcode = '22023';
  end if;
end
$$;

create or replace function dashboard_tasks_private.clean_names(value jsonb, max_length integer)
returns text[] language plpgsql immutable set search_path = pg_catalog as $$
declare
  entry jsonb;
  label text;
  results text[] := array[]::text[];
  normalized text[] := array[]::text[];
begin
  perform dashboard_tasks_private.require_array(value, max_length);
  for entry in select item from jsonb_array_elements(value) as items(item) loop
    label := dashboard_tasks_private.clean_text(entry, 32, true);
    if lower(label) = any(normalized) then
      raise exception 'Обнаружены повторяющиеся значения' using errcode = '22023';
    end if;
    results := array_append(results, label);
    normalized := array_append(normalized, lower(label));
  end loop;
  return results;
end
$$;

create or replace function dashboard_tasks_private.clean_colors(value jsonb, names text[])
returns jsonb language plpgsql immutable set search_path = pg_catalog as $$
begin
  if jsonb_typeof(value) is distinct from 'object' then
    raise exception 'Ожидается список цветов' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_each(value) as colors(name, color)
    where not (name = any(names)) or jsonb_typeof(color) <> 'string' or (color #>> '{}') !~ '^#[0-9a-fA-F]{6}$'
  ) then
    raise exception 'Укажите существующее значение и цвет в формате #RRGGBB' using errcode = '22023';
  end if;
  return value;
end
$$;

create or replace function dashboard_tasks_private.clean_date(value jsonb) returns text
language plpgsql set search_path = pg_catalog as $$
declare
  result text := dashboard_tasks_private.clean_text(value, 10);
begin
  if result = '' then return ''; end if;
  if result !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Используйте дату в формате ГГГГ-ММ-ДД' using errcode = '22023';
  end if;
  perform result::date;
  return result;
exception when datetime_field_overflow or invalid_datetime_format then
  raise exception 'Некорректная дата' using errcode = '22023';
end
$$;

-- A board is a single versioned document, so all settings and task changes commit together.
create or replace function public.dashboard_tasks_list() returns jsonb
language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  user_id uuid := dashboard_tasks_private.require_user();
  board_list jsonb;
  member_list jsonb;
  member_names jsonb;
begin
  select coalesce(jsonb_agg(document || jsonb_build_object('revision',revision) order by created_at,id), '[]'::jsonb)
  into board_list from dashboard_tasks_private.boards;
  select coalesce(jsonb_agg(id order by id),'[]'::jsonb),
         coalesce(jsonb_object_agg(id::text, coalesce(
           nullif(left(btrim(raw_user_meta_data->>'name'),64),''),
           nullif(left(btrim(raw_user_meta_data->>'full_name'),64),''),
           'Участник ' || left(id::text,8)
         )), '{}'::jsonb)
  into member_list, member_names
  from auth.users
  where deleted_at is null and (banned_until is null or banned_until <= now());
  return jsonb_build_object('boards',board_list,'user',user_id,'members',member_list,'memberNames',member_names);
end
$$;

create or replace function public.dashboard_tasks_create(p_id text, p_title text) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  user_id uuid := dashboard_tasks_private.require_user();
  board_id text := dashboard_tasks_private.clean_id(to_jsonb(p_id));
  title text := dashboard_tasks_private.clean_text(to_jsonb(p_title),64,true);
  result jsonb;
begin
  insert into dashboard_tasks_private.boards (id,document,updated_by)
  values (board_id, jsonb_build_object(
    'id',board_id,'title',title,
    'columns','[
      {"id":"todo","name":"К выполнению","archived":false},
      {"id":"doing","name":"В работе","archived":false},
      {"id":"done","name":"Готово","archived":false}
    ]'::jsonb,
    'labels','[]'::jsonb,'labelColors','{}'::jsonb,
    'priorities','["Trivial","Medium","High"]'::jsonb,
    'priorityColors','{"Trivial":"#60c5e2","Medium":"#a5a5bb","High":"#f99ba0"}'::jsonb,
    'defaultPriority','Medium','tasks','[]'::jsonb
  ), user_id)
  on conflict (id) do nothing;

  -- The client reuses its ID if the original response was lost.
  select document || jsonb_build_object('revision',revision)
  into strict result from dashboard_tasks_private.boards where id = board_id;
  return result;
end
$$;

create or replace function public.dashboard_tasks_save(p_board jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  user_id uuid := dashboard_tasks_private.require_user();
  board_id text;
  expected_revision bigint;
  stored dashboard_tasks_private.boards%rowtype;
  entry jsonb;
  item_id text;
  title text;
  archived boolean;
  has_active_column boolean := false;
  columns jsonb := '[]';
  column_ids text[] := array[]::text[];
  tasks jsonb[] := array[]::jsonb[];
  task_ids text[] := array[]::text[];
  old_tasks jsonb;
  previous jsonb;
  labels text[];
  priorities text[];
  label_colors jsonb;
  priority_colors jsonb;
  default_priority text;
  status text;
  assignee text;
  label text;
  priority text;
  starts_at text;
  ends_at text;
  completed_at text;
  today text := to_char(timezone('Europe/Moscow',now()),'YYYY-MM-DD');
  result jsonb;
begin
  if jsonb_typeof(p_board) is distinct from 'object' or octet_length(p_board::text) > 5 * 1024 * 1024 then
    raise exception 'Недопустимый размер или формат доски' using errcode = '22023';
  end if;
  board_id := dashboard_tasks_private.clean_id(p_board->'id');
  if jsonb_typeof(p_board->'revision') is distinct from 'number'
     or (p_board->>'revision') !~ '^[1-9][0-9]{0,17}$' then
    raise exception 'Некорректная версия доски' using errcode = '22023';
  end if;
  expected_revision := (p_board->>'revision')::bigint;
  select * into stored from dashboard_tasks_private.boards where id = board_id for update;
  if not found then
    raise exception 'Доска не найдена' using errcode = 'PT404';
  end if;
  if stored.revision <> expected_revision then
    raise exception 'Доска изменена. Обновите страницу перед повторным сохранением.' using errcode = 'PT409';
  end if;

  title := dashboard_tasks_private.clean_text(p_board->'title',64,true);
  perform dashboard_tasks_private.require_array(p_board->'columns',40);
  for entry in select item from jsonb_array_elements(p_board->'columns') as items(item) loop
    item_id := dashboard_tasks_private.clean_id(entry->'id');
    if item_id = any(column_ids) then
      raise exception 'Повторяющийся идентификатор колонки' using errcode = '22023';
    end if;
    if jsonb_typeof(coalesce(entry->'archived','false')) <> 'boolean' then
      raise exception 'Некорректное состояние колонки' using errcode = '22023';
    end if;
    archived := coalesce((entry->>'archived')::boolean,false);
    column_ids := array_append(column_ids,item_id);
    has_active_column := has_active_column or not archived;
    columns := columns || jsonb_build_array(jsonb_build_object(
      'id',item_id,'name',dashboard_tasks_private.clean_text(entry->'name',36,true),'archived',archived
    ));
  end loop;
  if not ('done' = any(column_ids)) or not has_active_column then
    raise exception 'Нужна колонка завершения и хотя бы одна активная колонка' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(stored.document->'columns') as items(item)
             where not (item->>'id' = any(column_ids))) then
    raise exception 'Колонки можно архивировать, но нельзя удалять' using errcode = '22023';
  end if;

  labels := dashboard_tasks_private.clean_names(coalesce(p_board->'labels','[]'),50);
  priorities := dashboard_tasks_private.clean_names(p_board->'priorities',25);
  label_colors := dashboard_tasks_private.clean_colors(coalesce(p_board->'labelColors','{}'),labels);
  priority_colors := dashboard_tasks_private.clean_colors(coalesce(p_board->'priorityColors','{}'),priorities);
  default_priority := dashboard_tasks_private.clean_text(p_board->'defaultPriority',32,true);
  if not (default_priority = any(priorities)) then
    raise exception 'Укажите существующую критичность по умолчанию' using errcode = '22023';
  end if;

  select coalesce(jsonb_object_agg(item->>'id',item),'{}'::jsonb) into old_tasks
  from jsonb_array_elements(stored.document->'tasks') as items(item);
  perform dashboard_tasks_private.require_array(p_board->'tasks',750);
  for entry in select item from jsonb_array_elements(p_board->'tasks') as items(item) loop
    item_id := dashboard_tasks_private.clean_id(entry->'id');
    if item_id = any(task_ids) then
      raise exception 'Повторяющийся идентификатор задачи' using errcode = '22023';
    end if;
    task_ids := array_append(task_ids,item_id);
    previous := old_tasks->item_id;
    status := dashboard_tasks_private.clean_id(entry->'status');
    if not (status = any(column_ids)) then
      raise exception 'Указана неизвестная колонка' using errcode = '22023';
    end if;

    assignee := lower(dashboard_tasks_private.clean_text(coalesce(entry->'assignee','""'),36));
    if assignee <> '' and assignee <> coalesce(previous->>'assignee','') then
      if assignee !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
        raise exception 'Указан неизвестный ответственный' using errcode = '22023';
      end if;
      if not exists (
        select 1 from auth.users
        where id = assignee::uuid and deleted_at is null and (banned_until is null or banned_until <= now())
      ) then
        raise exception 'Указан неизвестный ответственный' using errcode = '22023';
      end if;
    end if;
    starts_at := dashboard_tasks_private.clean_date(coalesce(entry->'start','""'));
    ends_at := dashboard_tasks_private.clean_date(coalesce(entry->'end','""'));
    if starts_at <> '' and ends_at <> '' and ends_at < starts_at then
      raise exception 'Срок должен быть не раньше начала' using errcode = '22023';
    end if;
    label := dashboard_tasks_private.clean_text(coalesce(entry->'label','""'),32);
    priority := dashboard_tasks_private.clean_text(coalesce(entry->'priority',to_jsonb(default_priority)),32,true);
    if label <> '' and not (label = any(labels)) then
      raise exception 'Указана неизвестная метка' using errcode = '22023';
    end if;
    if not (priority = any(priorities)) then
      raise exception 'Указан неизвестный уровень критичности' using errcode = '22023';
    end if;

    completed_at := '';
    if status = 'done' then
      completed_at := case when previous->>'status' = 'done' then nullif(previous->>'completedAt','') end;
      completed_at := coalesce(completed_at,today);
    end if;
    tasks := array_append(tasks,jsonb_build_object(
      'id',item_id,'title',dashboard_tasks_private.clean_text(entry->'title',160,true),
      'description',dashboard_tasks_private.clean_text(coalesce(entry->'description','""'),1500),
      'assignee',assignee,'status',status,'start',starts_at,'end',ends_at,'label',label,
      'priority',priority,'completedAt',completed_at
    ));
  end loop;
  if exists (select 1 from jsonb_object_keys(old_tasks) as previous_ids(id) where not (id = any(task_ids))) then
    raise exception 'Удаление задач недоступно' using errcode = '22023';
  end if;

  update dashboard_tasks_private.boards
  set document = jsonb_build_object(
    'id',board_id,'title',title,'columns',columns,'labels',labels,'labelColors',label_colors,
    'priorities',priorities,'priorityColors',priority_colors,'defaultPriority',default_priority,'tasks',to_jsonb(tasks)
  ), revision = revision + 1, updated_at = now(), updated_by = user_id
  where id = board_id and revision = expected_revision
  returning document || jsonb_build_object('revision',revision) into result;
  if not found then
    raise exception 'Доска изменена. Обновите страницу перед повторным сохранением.' using errcode = 'PT409';
  end if;
  return result;
end
$$;

revoke execute on all functions in schema dashboard_tasks_private from public, anon, authenticated, service_role;
revoke execute on function public.dashboard_tasks_list() from public, anon, authenticated, service_role;
revoke execute on function public.dashboard_tasks_create(text,text) from public, anon, authenticated, service_role;
revoke execute on function public.dashboard_tasks_save(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.dashboard_tasks_list() to authenticated;
grant execute on function public.dashboard_tasks_create(text,text) to authenticated;
grant execute on function public.dashboard_tasks_save(jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
