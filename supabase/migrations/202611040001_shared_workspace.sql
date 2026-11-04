begin;
create table private.shared_workspace (
  singleton boolean primary key default true check (singleton),
  revision integer not null default 0,
  state jsonb not null default '{"productLines":[],"projects":[],"tasks":[],"comments":[],"activityLog":[]}'
);
alter table private.shared_workspace enable row level security;
revoke all on private.shared_workspace from public, anon, authenticated;
insert into private.shared_workspace default values;

create function public.read_shared_workspace() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.users where id = auth.uid() and is_active) then
    raise exception 'Workspace access required' using errcode = '42501';
  end if;
  return (select jsonb_build_object('revision', revision, 'state', state) from private.shared_workspace);
end;
$$;

create function public.save_shared_workspace(expected_revision integer, next_state jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  current_row private.shared_workspace;
  collection text;
begin
  select role into actor_role from public.users where id = actor and is_active;
  if actor_role is null or actor_role not in ('member','manager') then
    raise exception 'Workspace access required' using errcode = '42501';
  end if;
  select * into current_row from private.shared_workspace for update;
  if current_row.revision is distinct from expected_revision then
    raise exception 'Workspace changed in another session' using errcode = '40001';
  end if;
  if next_state is null or pg_column_size(next_state) > 4000000 then
    raise exception 'Invalid workspace size' using errcode = '22023';
  end if;
  foreach collection in array array['productLines','projects','tasks','comments','activityLog'] loop
    if jsonb_typeof(next_state->collection) is distinct from 'array' then
      raise exception 'Invalid workspace collection' using errcode = '22023';
    end if;
    if exists(select 1 from jsonb_array_elements(next_state->collection) item
              group by item->>'id' having item->>'id' is null or count(*) > 1) then
      raise exception 'Invalid or duplicate record ID' using errcode = '22023';
    end if;
  end loop;
  if actor_role = 'member' and (
    next_state->'projects' <> current_row.state->'projects' or
    next_state->'productLines' <> current_row.state->'productLines' or
    exists (
      select 1 from jsonb_array_elements(current_row.state->'tasks') old
      full join jsonb_array_elements(next_state->'tasks') new on old->>'id' = new->>'id'
      where old is distinct from new and (
        old is null or new is null or old->>'assignee_id' is distinct from actor::text or
        (old - array['status','actual_days','blocked_days','blocked_reason','updated_at','completed_at'])
        <> (new - array['status','actual_days','blocked_days','blocked_reason','updated_at','completed_at'])
      )
    )
  ) then raise exception 'Members can update progress on assigned tasks only' using errcode = '42501';
  end if;
  if exists (
    select 1 from jsonb_array_elements(next_state->'tasks') task
    where coalesce(task->>'status','') not in ('backlog','in_progress','blocked','done')
       or not exists(select 1 from jsonb_array_elements(next_state->'projects') project
                     where project->>'id'=task->>'project_id')
  ) then raise exception 'Invalid task status or product' using errcode = '22023';
  end if;
  foreach collection in array array['comments','activityLog'] loop
    if exists (
      select 1 from jsonb_array_elements(current_row.state->collection) old
      full join jsonb_array_elements(next_state->collection) new on old->>'id'=new->>'id'
      where old is distinct from new and (
        old is not null or new->>(case when collection='comments' then 'author_id' else 'actor_id' end) is distinct from actor::text
      )
    ) then raise exception 'Existing history cannot be modified and new entries must belong to the caller' using errcode='42501';
    end if;
  end loop;
  update private.shared_workspace set state = next_state, revision = revision + 1;
  return current_row.revision + 1;
end;
$$;

revoke all on function public.read_shared_workspace(), public.save_shared_workspace(integer,jsonb) from public, anon, authenticated;
grant execute on function public.read_shared_workspace(), public.save_shared_workspace(integer,jsonb) to authenticated;
commit;
