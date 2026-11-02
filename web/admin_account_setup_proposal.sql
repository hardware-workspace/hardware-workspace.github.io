-- Proposed setup for review against the real database. Not applied.
-- Requires the existing public.users schema from web/.
-- Open registration deliberately permits members and managers; admin is separate.
begin;
-- Defaults apply only to new profiles; do not reactivate disabled accounts.
alter table public.users alter column is_active set default true;
create schema if not exists private;
create table if not exists private.system_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.system_admins from public, anon, authenticated;
alter table private.system_admins enable row level security;

create or replace function public.is_system_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from private.system_admins a join public.users u on u.id=a.user_id where a.user_id=(select auth.uid()) and u.is_active=true);
$$;
revoke all on function public.is_system_admin() from public, anon;
grant execute on function public.is_system_admin() to authenticated;

create or replace function public.admin_list_users()
returns table(id uuid,name text,email text,role text,is_active boolean)
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_system_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 return query select u.id,u.name,u.email,u.role,u.is_active from public.users u order by u.name;
end;
$$;
create or replace function public.admin_update_user(target_id uuid,new_role text,active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_system_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 if new_role not in ('member','manager') or new_role is null or active is null then raise exception 'Invalid settings'; end if;
 if exists(select 1 from private.system_admins where user_id=target_id) then raise exception 'System administrators must be managed through trusted database administration'; end if;
 update public.users set role=new_role,is_active=active where id=target_id;
 if not found then raise exception 'User not found'; end if;
end;
$$;
revoke all on function public.admin_list_users(),public.admin_update_user(uuid,text,boolean) from public,anon;
grant execute on function public.admin_list_users(),public.admin_update_user(uuid,text,boolean) to authenticated;
-- Persist the selected signup role once; later client edits cannot change stored roles or access.
revoke insert,update,delete on public.users from anon,authenticated;
alter table public.users enable row level security;
drop policy if exists "Read own authentication profile" on public.users;
create policy "Read own authentication profile" on public.users for select to authenticated using (id=(select auth.uid()));
grant select on public.users to authenticated;

create or replace function private.create_workspace_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.users(id,name,email,role,is_active)
 values(new.id,coalesce(nullif(left(trim(new.raw_user_meta_data->>'full_name'),100),''),'Team member'),new.email,case when new.raw_user_meta_data->>'requested_role'='manager' then 'manager' else 'member' end,true);
 return new;
end;
$$;
revoke all on function private.create_workspace_profile() from public,anon,authenticated;
drop trigger if exists create_workspace_profile on auth.users;
create trigger create_workspace_profile after insert on auth.users for each row execute function private.create_workspace_profile();

-- Add only missing profiles; never reactivate or change existing accounts.
insert into public.users(id,name,email,role,is_active)
select id,coalesce(nullif(left(trim(raw_user_meta_data->>'full_name'),100),''),'Team member'),email,
 case when raw_user_meta_data->>'requested_role'='manager' then 'manager' else 'member' end,true
from auth.users where email is not null on conflict(id) do nothing;
commit;
-- Bootstrap the first admin ONLY through a trusted database session, using the
-- actual auth.users UUID for the intended verified account. Never accept this ID
-- or admin privileges from signup metadata. Set its public.users.is_active=true,
-- then insert that UUID into private.system_admins. No account is promoted here.
