-- One-time production schedule assignment, applied 2026-11-05.
-- Preserve the existing dated task and every other task field.
-- The private backup table captures the exact state before this change.
begin;

do $$
begin
  if not exists (
    select 1 from private.shared_workspace w
    where w.singleton = true
      and w.revision = 80
      and jsonb_array_length(w.state->'tasks') = 177
      and (
        select count(*) from jsonb_array_elements(w.state->'tasks') t
        where nullif(t->>'start_date', '') is null
          and nullif(t->>'due_date', '') is null
      ) = 176
  ) then
    raise exception 'Workspace changed; inspect current tasks before scheduling';
  end if;
end $$;

create table private.shared_workspace_backup_20261105_pre_schedule as
select revision, state, now() as backed_up_at
from private.shared_workspace
where singleton = true;

revoke all on private.shared_workspace_backup_20261105_pre_schedule
  from public, anon, authenticated;
alter table private.shared_workspace_backup_20261105_pre_schedule
  enable row level security;

with calendar as (
  select array_agg(day::date order by day) as workdays
  from generate_series(date '2026-11-01', date '2026-12-31', interval '1 day') day
  where extract(isodow from day) in (1, 2, 3, 4, 7) -- Cairo Sun-Thu workweek
), scheduled as (
  select w.singleton,
    jsonb_agg(
      case
        when nullif(task->>'start_date', '') is null
         and nullif(task->>'due_date', '') is null
        then task || jsonb_build_object(
          'start_date', c.workdays[slot.start_index]::text,
          'due_date', c.workdays[slot.start_index + slot.duration]::text,
          'planned_days', slot.duration
        )
        else task
      end order by ordinal
    ) as tasks
  from private.shared_workspace w
  cross join calendar c
  cross join lateral jsonb_array_elements(w.state->'tasks')
    with ordinality as item(task, ordinal)
  cross join lateral (
    select
      (abs(hashtext(task->>'id')::bigint) % (array_length(c.workdays, 1) - 4) + 1)::int as start_index,
      (abs(hashtext((task->>'id') || ':duration')::bigint) % 4 + 1)::int as duration
  ) slot
  where w.singleton = true and w.revision = 80
  group by w.singleton
)
update private.shared_workspace w
set state = jsonb_set(w.state, '{tasks}', s.tasks),
    revision = w.revision + 1
from scheduled s
where w.singleton = true and w.revision = 80 and w.singleton = s.singleton;

commit;

select revision,
  jsonb_array_length(state->'tasks') as tasks,
  (select count(*) from jsonb_array_elements(state->'tasks') t
   where nullif(t->>'start_date', '') is not null
     and nullif(t->>'due_date', '') is not null) as scheduled,
  (select min(t->>'start_date') from jsonb_array_elements(state->'tasks') t) as first_start,
  (select max(t->>'due_date') from jsonb_array_elements(state->'tasks') t) as last_due,
  (select count(*) from jsonb_array_elements(state->'tasks') t
   where t->>'start_date' = '2026-11-03' and t->>'due_date' = '2026-11-04'
     and t->>'id' = 'task-66033783-c3ea-5bdf-a35e-369d8ae7d27e') as existing_task_preserved
from private.shared_workspace where singleton = true;
