begin;

create table public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index personal_notes_owner_updated_idx on public.personal_notes (owner_id, updated_at desc);
alter table public.personal_notes enable row level security;
create policy personal_notes_owner_only on public.personal_notes
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
revoke all on public.personal_notes from public, anon, authenticated;
grant select, insert, update, delete on public.personal_notes to authenticated;

-- Members can convert one of their own notes without granting them general
-- permission to create or modify arbitrary shared workspace records.
create function public.create_task_from_note(note_id uuid, task_data jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  current_row private.shared_workspace;
  assignee uuid;
begin
  select role into actor_role from public.users where id = actor and is_active;
  if actor_role not in ('member', 'manager') or actor_role is null then
    raise exception 'Task creation is unavailable for this account' using errcode = '42501';
  end if;
  if not exists (select 1 from public.personal_notes where id = note_id and owner_id = actor) then
    raise exception 'Note not found' using errcode = '42501';
  end if;
  if task_data is null or jsonb_typeof(task_data) is distinct from 'object'
     or pg_column_size(task_data) > 30000
     or coalesce(task_data->>'id', '') !~ '^task-[0-9]+$'
     or char_length(coalesce(task_data->>'title', '')) not between 1 and 300
     or char_length(coalesce(task_data->>'details', '')) > 10000
     or task_data->>'created_by' is distinct from actor::text
     or task_data->>'status' is distinct from 'backlog'
     or nullif(task_data->>'project_id', '') is null then
    raise exception 'Invalid task from note' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(task_data) field
    where field not in ('id','project_id','title','details','assignee_id','priority','criticality','weight',
      'start_date','due_date','planned_days','extra_hours_per_day','friday_hours','saturday_hours',
      'actual_days','blocked_days','depends_on_id','dependencies_enabled','status','blocked_reason',
      'approved_by','time_spent_note','position','created_by','created_at','updated_at','completed_at')
  ) then raise exception 'Invalid task fields' using errcode = '22023'; end if;

  if nullif(task_data->>'assignee_id', '') is not null then
    begin
      assignee := (task_data->>'assignee_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid assignee' using errcode = '22023';
    end;
    if not exists (select 1 from public.users where id = assignee and is_active and role in ('manager','member')) then
      raise exception 'Invalid assignee' using errcode = '22023';
    end if;
  end if;

  select * into current_row from private.shared_workspace where singleton = true for update;
  if not exists (
    select 1 from jsonb_array_elements(current_row.state->'projects') product
    where product->>'id' = task_data->>'project_id' and coalesce((product->>'archived')::boolean, false) = false
  ) then raise exception 'Product not found' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_array_elements(current_row.state->'tasks') task
    where task->>'id' = task_data->>'id'
  ) then raise exception 'Task already exists' using errcode = '23505'; end if;

  update private.shared_workspace
  set state = jsonb_set(current_row.state, '{tasks}', current_row.state->'tasks' || jsonb_build_array(task_data)),
      revision = current_row.revision + 1
  where singleton = true;
  return current_row.revision + 1;
end;
$$;

revoke all on function public.create_task_from_note(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.create_task_from_note(uuid,jsonb) to authenticated;

commit;
