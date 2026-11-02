begin;
create or replace function public.admin_user_protected(target_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_system_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 return exists(select 1 from private.system_admins where user_id=target_id);
end;
$$;
revoke all on function public.admin_user_protected(uuid) from public,anon;
grant execute on function public.admin_user_protected(uuid) to authenticated;
create or replace function private.sync_workspace_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 update public.users set email=new.email,name=coalesce(nullif(left(trim(new.raw_user_meta_data->>'full_name'),100),''),name) where id=new.id;
 return new;
end;
$$;
revoke all on function private.sync_workspace_identity() from public,anon,authenticated;
create trigger sync_workspace_identity after update of email,raw_user_meta_data on auth.users for each row execute function private.sync_workspace_identity();
-- Require the profile FK to cascade so auth deletion cannot leave orphan accounts.
do $$ begin
 if not exists(select 1 from pg_constraint c where c.conrelid='public.users'::regclass and c.confrelid='auth.users'::regclass and c.contype='f' and c.confdeltype='c') then
 raise exception 'public.users must reference auth.users with ON DELETE CASCADE before deploying admin CRUD';
 end if;
end $$;
commit;
