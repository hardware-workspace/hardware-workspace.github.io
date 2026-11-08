begin;
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('member','manager','viewer'));

create or replace function public.admin_update_user(target_id uuid,new_role text,active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_system_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 if new_role not in ('member','manager','viewer') or new_role is null or active is null then raise exception 'Invalid settings'; end if;
 if exists(select 1 from private.system_admins where user_id=target_id) then raise exception 'System administrators must be managed through trusted database administration'; end if;
 update public.users set role=new_role,is_active=active where id=target_id;
 if not found then raise exception 'User not found'; end if;
end;
$$;
revoke all on function public.admin_list_users(),public.admin_update_user(uuid,text,boolean) from public,anon;
grant execute on function public.admin_list_users(),public.admin_update_user(uuid,text,boolean) to authenticated;
create or replace function public.save_shared_workspace(expected_revision integer, next_state jsonb) returns integer
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
        (old - array['status','actual_days','blocked_days','blocked_reason','updated_at','completed_at',
          'title','details','priority','criticality','weight','start_date','due_date','extra_hours_per_day',
          'friday_hours','saturday_hours','depends_on_id','dependencies_enabled'])
        <> (new - array['status','actual_days','blocked_days','blocked_reason','updated_at','completed_at',
          'title','details','priority','criticality','weight','start_date','due_date','extra_hours_per_day',
          'friday_hours','saturday_hours','depends_on_id','dependencies_enabled'])
      )
    )
  ) then raise exception 'Members can edit assigned tasks without changing planned duration or ownership' using errcode = '42501';
  end if;
  if exists (
    select 1 from jsonb_array_elements(next_state->'tasks') task
    where coalesce(task->>'status','') not in ('backlog','in_progress','blocked','done')
       or not exists(select 1 from jsonb_array_elements(next_state->'projects') project
                     where project->>'id'=task->>'project_id')
  ) then raise exception 'Invalid task status or product' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(next_state->'tasks') task
    left join jsonb_array_elements(current_row.state->'tasks') old on old->>'id'=task->>'id'
    where task->>'status' = 'done'
      and nullif(task->>'depends_on_id','') is not null
      and (old->>'status' is distinct from 'done' or old->>'depends_on_id' is distinct from task->>'depends_on_id')
      and not exists (
        select 1 from jsonb_array_elements(next_state->'tasks') prerequisite
        where prerequisite->>'id'=task->>'depends_on_id' and prerequisite->>'status'='done'
      )
  ) then raise exception 'Finish the prerequisite task first' using errcode = '22023';
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
  update private.shared_workspace set state = next_state, revision = revision + 1 where singleton = true;
  return current_row.revision + 1;
end;
$$;

commit;
