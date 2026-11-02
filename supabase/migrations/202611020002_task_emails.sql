begin;
create table public.task_email_preferences (
 user_id uuid primary key references public.users(id) on delete cascade default auth.uid(),
 assignments boolean not null default true, deadlines boolean not null default true,
 overdue boolean not null default true, status_changes boolean not null default true,
 comments boolean not null default true, mentions boolean not null default true,
 summary text not null default 'weekly' check(summary in ('off','daily','weekly')),
 reminder_days integer not null default 2 check(reminder_days between 0 and 14)
);
alter table public.task_email_preferences enable row level security;
create policy own_email_preferences on public.task_email_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.task_email_preferences from public,anon,authenticated;
grant select,insert,update on public.task_email_preferences to authenticated;
create table private.email_tasks (
 id text primary key, title text not null, assignee_id uuid references public.users(id) on delete cascade,
 status text not null, due_date date, updated_at timestamptz not null default now()
);
create table private.task_email_queue (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 task_id text, kind text not null, subject text not null, body text not null,
 dedupe_key text unique not null, created_at timestamptz not null default now(),
 sent_at timestamptz, attempts integer not null default 0, locked_until timestamptz,
 provider_id text, last_error text
);
revoke all on private.email_tasks,private.task_email_queue from public,anon,authenticated;
alter table private.email_tasks enable row level security;
alter table private.task_email_queue enable row level security;
create function private.queue_task_email(uid uuid, tid text, kind text, subject text, body text, dedupe text) returns void
language sql security definer set search_path='' as $$
 insert into private.task_email_queue(user_id,task_id,kind,subject,body,dedupe_key)
 select uid,tid,kind,left(subject,200),left(body,10000),dedupe
 where uid is not null and (select count(*) from private.task_email_queue where user_id=uid and created_at>now()-interval '24 hours')<100 and exists(select 1 from public.users where id=uid and is_active)
 on conflict(dedupe_key) do nothing;
$$;
revoke all on function private.queue_task_email(uuid,text,text,text,text,text) from public,anon,authenticated;
create function public.record_task_email_event(task_data jsonb, event_id text, comment_body text default null, removed boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.users; old_task private.email_tasks; next_task private.email_tasks; target public.users;
begin
 select * into actor from public.users where id=auth.uid() and is_active;
 if actor.id is null then raise exception 'Forbidden' using errcode='42501'; end if;
 if length(event_id)>150 or event_id is null or length(task_data->>'id')>200 or coalesce(task_data->>'id','')='' then raise exception 'Invalid event'; end if;
 -- Serialize writes for this task, including first insert.
 perform pg_advisory_xact_lock(hashtextextended(task_data->>'id',0));
 select * into old_task from private.email_tasks where id=task_data->>'id';
 if actor.role<>'manager' and (old_task.id is null or old_task.assignee_id is distinct from actor.id) then raise exception 'Forbidden' using errcode='42501'; end if;
 if removed then
   if actor.role<>'manager' then raise exception 'Forbidden'; end if;
   delete from private.email_tasks where id=task_data->>'id';
   return;
 end if;
 if comment_body is not null then
   if old_task.id is null then raise exception 'Save the task first'; end if;
   select * into target from public.users where id=old_task.assignee_id;
   perform private.queue_task_email(target.id,old_task.id,
    case when position(lower('@'||target.email) in lower(comment_body))>0 or position(lower('@'||target.name) in lower(comment_body))>0 then 'mentions' else 'comments' end,
    'Comment: '||old_task.title,actor.name||': '||left(comment_body,8000),'comment:'||old_task.id||':'||event_id);
   return;
 end if;
 next_task.id:=task_data->>'id'; next_task.title:=left(task_data->>'title',300);
 next_task.status:=task_data->>'status';
 if next_task.status not in ('backlog','in_progress','blocked','done') or coalesce(next_task.title,'')='' then raise exception 'Invalid task'; end if;
 if actor.role='manager' then
   next_task.assignee_id:=nullif(task_data->>'assignee_id','')::uuid;
   next_task.due_date:=nullif(task_data->>'due_date','')::date;
 else
   next_task.assignee_id:=old_task.assignee_id; next_task.due_date:=old_task.due_date; next_task.title:=old_task.title;
 end if;
 insert into private.email_tasks(id,title,status,assignee_id,due_date) values(next_task.id,next_task.title,next_task.status,next_task.assignee_id,next_task.due_date)
 on conflict(id) do update set title=excluded.title,status=excluded.status,assignee_id=excluded.assignee_id,due_date=excluded.due_date,updated_at=now();
 insert into public.task_email_preferences(user_id) select next_task.assignee_id where next_task.assignee_id is not null on conflict do nothing;
 if next_task.assignee_id is distinct from old_task.assignee_id then
   perform private.queue_task_email(next_task.assignee_id,next_task.id,'assignments','Task assigned: '||next_task.title,actor.name||' assigned this task to you. Due: '||coalesce(next_task.due_date::text,'Unscheduled'),'assigned:'||next_task.id||':'||event_id);
 end if;
 if old_task.id is not null and next_task.status<>old_task.status then
   perform private.queue_task_email(next_task.assignee_id,next_task.id,'status_changes','Task status: '||next_task.title,actor.name||' changed the status to '||next_task.status,'status:'||next_task.id||':'||event_id);
 end if;
end;
$$;
revoke all on function public.record_task_email_event(jsonb,text,text,boolean) from public,anon;
grant execute on function public.record_task_email_event(jsonb,text,text,boolean) to authenticated;
create function public.prepare_scheduled_task_emails() returns void
language plpgsql security definer set search_path='' as $$
declare today date:=(now() at time zone 'Africa/Cairo')::date; t record; u record;
begin
 for t in select e.*,coalesce(p.reminder_days,2) reminder_days from private.email_tasks e left join public.task_email_preferences p on p.user_id=e.assignee_id where e.status<>'done' and e.due_date is not null loop
   if t.due_date<today then
     perform private.queue_task_email(t.assignee_id,t.id,'overdue','Overdue: '||t.title,'This task was due on '||t.due_date,'overdue:'||t.id||':'||t.assignee_id||':'||today);
   elsif t.due_date<=today+t.reminder_days then
     perform private.queue_task_email(t.assignee_id,t.id,'deadlines','Due soon: '||t.title,'This task is due on '||t.due_date,'deadline:'||t.id||':'||t.assignee_id||':'||today);
   end if;
 end loop;
 if extract(hour from now() at time zone 'Africa/Cairo')<9 then return; end if;
 for u in select p.user_id,p.summary,string_agg(e.title||' — '||e.status||' — due '||coalesce(e.due_date::text,'Unscheduled'),E'\n' order by e.due_date nulls last) body
 from public.task_email_preferences p join private.email_tasks e on e.assignee_id=p.user_id
 where p.summary='daily' or (p.summary='weekly' and extract(isodow from today)=1)
 group by p.user_id,p.summary loop
   perform private.queue_task_email(u.user_id,null,'summary','Your '||u.summary||' task summary',u.body,'summary:'||u.user_id||':'||u.summary||':'||today);
 end loop;
end;
$$;
create function public.claim_task_emails() returns table(id uuid,email text,subject text,body text,task_id text)
language plpgsql security definer set search_path='' as $$
begin
 -- Resolve the email and preferences at send time, never from browser-supplied recipients.
 return query with picked as (
 select q.id from private.task_email_queue q join public.users u on u.id=q.user_id left join public.task_email_preferences p on p.user_id=u.id
 where q.sent_at is null and q.attempts<5 and (q.locked_until is null or q.locked_until<now()) and q.created_at>now()-interval '23 hours' and u.is_active and (q.task_id is null or exists(select 1 from private.email_tasks e where e.id=q.task_id and e.assignee_id=q.user_id and (q.kind not in ('deadlines','overdue') or e.status<>'done')))
 and case q.kind when 'assignments' then coalesce(p.assignments,true) when 'deadlines' then coalesce(p.deadlines,true) when 'overdue' then coalesce(p.overdue,true) when 'status_changes' then coalesce(p.status_changes,true) when 'comments' then coalesce(p.comments,true) when 'mentions' then coalesce(p.mentions,true) when 'summary' then coalesce(p.summary,'weekly')<>'off' else false end
 order by q.created_at limit 5 for update of q skip locked
 ), claimed as (update private.task_email_queue q set locked_until=now()+interval '5 minutes',attempts=q.attempts+1 from picked where q.id=picked.id returning q.*)
 select c.id,u.email,c.subject,c.body,c.task_id from claimed c join public.users u on u.id=c.user_id;
end;
$$;
create function public.finish_task_email(message_id uuid, receipt text, failure text default null) returns void
language sql security definer set search_path='' as $$
 update private.task_email_queue set sent_at=case when failure is null then now() else null end,provider_id=receipt,last_error=left(failure,500),locked_until=case when failure is null then null else now()+interval '10 minutes' end where id=message_id;
$$;
revoke all on function public.prepare_scheduled_task_emails(),public.claim_task_emails(),public.finish_task_email(uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_scheduled_task_emails(),public.claim_task_emails(),public.finish_task_email(uuid,text,text) to service_role;
create function public.task_assignee_directory() returns table(id uuid,name text,email text,role text,is_active boolean)
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.users u where u.id=auth.uid() and u.is_active) then raise exception 'Forbidden'; end if;
 return query select u.id,u.name,u.email,u.role,u.is_active from public.users u where u.is_active;
end;
$$;
revoke all on function public.task_assignee_directory() from public,anon;
grant execute on function public.task_assignee_directory() to authenticated;
commit;
