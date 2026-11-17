-- Only a super admin may change profiles.role / profiles.is_admin.
-- Closes self-promotion (UPDATE) and delete+reinsert (INSERT) paths.
-- Trusted contexts: SQL editor / migrations (no JWT) and service_role.

create or replace function public.is_super_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles
    where user_id = p_user_id and role = 'super_admin'
  );
$fn$;

revoke all on function public.is_super_admin(uuid) from public, anon;
grant execute on function public.is_super_admin(uuid) to authenticated, service_role;

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_jwt_role text := coalesce(auth.role(), '');
  v_elevated boolean;
begin
  if tg_op = 'INSERT' then
    v_elevated := coalesce(new.role, 'user') <> 'user' or coalesce(new.is_admin, false);
  else
    v_elevated := new.role is distinct from old.role
               or new.is_admin is distinct from old.is_admin;
  end if;

  if not v_elevated then
    return new;
  end if;

  if auth.uid() is null and v_jwt_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if public.is_super_admin(auth.uid()) then
    return new;
  end if;

  raise exception 'Only a super admin can change role or admin status'
    using errcode = '42501';
end;
$fn$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before insert or update of role, is_admin on public.profiles
  for each row execute function public.protect_profile_privileged_columns();