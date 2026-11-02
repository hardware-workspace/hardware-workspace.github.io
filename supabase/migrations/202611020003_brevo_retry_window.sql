begin;
alter table private.task_email_queue add column if not exists brevo_first_attempt_at timestamptz;
create function public.claim_brevo_task_emails() returns table(id uuid,email text,subject text,body text,task_id text)
language plpgsql security definer set search_path='' as $$
begin
 -- Resolve the email and preferences at send time, never from browser-supplied recipients.
 return query with picked as (
 select q.id from private.task_email_queue q join public.users u on u.id=q.user_id left join public.task_email_preferences p on p.user_id=u.id
 where q.sent_at is null and q.attempts<5 and (q.brevo_first_attempt_at is null or q.brevo_first_attempt_at>now()-interval '25 minutes') and (q.locked_until is null or q.locked_until<now()) and q.created_at>now()-interval '23 hours' and u.is_active and (q.task_id is null or exists(select 1 from private.email_tasks e where e.id=q.task_id and e.assignee_id=q.user_id and (q.kind not in ('deadlines','overdue') or e.status<>'done')))
 and case q.kind when 'assignments' then coalesce(p.assignments,true) when 'deadlines' then coalesce(p.deadlines,true) when 'overdue' then coalesce(p.overdue,true) when 'status_changes' then coalesce(p.status_changes,true) when 'comments' then coalesce(p.comments,true) when 'mentions' then coalesce(p.mentions,true) when 'summary' then coalesce(p.summary,'weekly')<>'off' else false end
 order by q.created_at limit 5 for update of q skip locked
 ), claimed as (update private.task_email_queue q set brevo_first_attempt_at=coalesce(q.brevo_first_attempt_at,now()),locked_until=now()+interval '5 minutes',attempts=q.attempts+1 from picked where q.id=picked.id returning q.*)
 select c.id,u.email,c.subject,c.body,c.task_id from claimed c join public.users u on u.id=c.user_id;
end;
$$;

revoke all on function public.claim_brevo_task_emails() from public,anon,authenticated;
grant execute on function public.claim_brevo_task_emails() to service_role;
commit;
