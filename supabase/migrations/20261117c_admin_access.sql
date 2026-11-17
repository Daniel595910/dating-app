-- CP4: admin_access - suspend/reactivate, per-admin permission overrides, last-active.
-- Suspend demotes profiles.role to 'user' (so every existing RLS policy stops admitting
-- the admin) and remembers the old role here. Permission overrides are admin-app level
-- only (menus/routes); the role remains the database boundary.

create table if not exists public.admin_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  saved_role text check (saved_role is null or saved_role in ('admin', 'moderator', 'support_agent', 'analyst')),
  extra_permissions text[] not null default '{}',
  removed_permissions text[] not null default '{}',
  suspended_reason text,
  suspended_at timestamptz,
  suspended_by uuid references auth.users(id) on delete set null,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_access enable row level security;

revoke all on public.admin_access from anon, authenticated;
grant select on public.admin_access to authenticated;
grant all on public.admin_access to service_role;

drop policy if exists "Read own access row or all as super admin" on public.admin_access;
create policy "Read own access row or all as super admin" on public.admin_access
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin(auth.uid()));

-- Suspend an admin (super admin only)
create or replace function public.admin_suspend(p_user_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_role text;
  v_is_admin boolean;
begin
  if auth.uid() is null or not public.is_super_admin(auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'Only super admins can suspend admins');
  end if;
  if p_user_id = auth.uid() then
    return jsonb_build_object('success', false, 'error', 'You cannot suspend yourself');
  end if;

  select role, coalesce(is_admin, false) into v_role, v_is_admin
  from public.profiles where user_id = p_user_id;

  if v_role is null then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;
  if v_role = 'super_admin' then
    return jsonb_build_object('success', false, 'error', 'Super admins cannot be suspended');
  end if;
  if not v_is_admin then
    return jsonb_build_object('success', false, 'error', 'User is not an admin');
  end if;

  insert into public.admin_access (user_id, status, saved_role, suspended_reason, suspended_at, suspended_by, updated_at)
  values (p_user_id, 'suspended', v_role, nullif(left(coalesce(p_reason, ''), 500), ''), now(), auth.uid(), now())
  on conflict (user_id) do update set
    status = 'suspended',
    saved_role = excluded.saved_role,
    suspended_reason = excluded.suspended_reason,
    suspended_at = excluded.suspended_at,
    suspended_by = excluded.suspended_by,
    updated_at = now();

  update public.profiles set role = 'user', is_admin = false where user_id = p_user_id;

  insert into public.audit_logs (user_id, action, resource_type, resource_id, changes)
  values (auth.uid(), 'suspend_admin', 'profile', p_user_id,
          jsonb_build_object('saved_role', v_role, 'reason', p_reason));

  return jsonb_build_object('success', true);
end;
$fn$;

-- Reactivate a suspended admin (super admin only)
create or replace function public.admin_reactivate(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_status text;
  v_saved text;
  v_is_admin boolean;
begin
  if auth.uid() is null or not public.is_super_admin(auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'Only super admins can reactivate admins');
  end if;

  select status, saved_role into v_status, v_saved
  from public.admin_access where user_id = p_user_id;

  if v_status is distinct from 'suspended' or v_saved is null then
    return jsonb_build_object('success', false, 'error', 'Admin is not suspended');
  end if;

  select coalesce(is_admin, false) into v_is_admin from public.profiles where user_id = p_user_id;
  if v_is_admin is null then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;
  if v_is_admin then
    return jsonb_build_object('success', false, 'error', 'User already has admin access');
  end if;

  update public.profiles set role = v_saved, is_admin = true where user_id = p_user_id;

  update public.admin_access set
    status = 'active', saved_role = null, suspended_reason = null,
    suspended_at = null, suspended_by = null, updated_at = now()
  where user_id = p_user_id;

  insert into public.audit_logs (user_id, action, resource_type, resource_id, changes)
  values (auth.uid(), 'reactivate_admin', 'profile', p_user_id, jsonb_build_object('role', v_saved));

  return jsonb_build_object('success', true, 'role', v_saved);
end;
$fn$;

-- Set per-admin permission overrides on top of the role preset (super admin only)
create or replace function public.admin_set_permissions(p_user_id uuid, p_extra text[], p_removed text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_role text;
  v_is_admin boolean;
  v_extra text[];
  v_removed text[];
begin
  if auth.uid() is null or not public.is_super_admin(auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'Only super admins can set admin permissions');
  end if;

  select role, coalesce(is_admin, false) into v_role, v_is_admin
  from public.profiles where user_id = p_user_id;

  if v_role is null then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;
  if v_role = 'super_admin' then
    return jsonb_build_object('success', false, 'error', 'Super admins always have every permission');
  end if;
  if not v_is_admin then
    return jsonb_build_object('success', false, 'error', 'User is not an admin');
  end if;

  if coalesce(cardinality(p_extra), 0) > 40 or coalesce(cardinality(p_removed), 0) > 40 then
    return jsonb_build_object('success', false, 'error', 'Too many permissions');
  end if;
  if exists (
    select 1 from unnest(coalesce(p_extra, '{}'::text[]) || coalesce(p_removed, '{}'::text[])) x
    where x !~ '^[A-Z_]{3,40}$'
  ) then
    return jsonb_build_object('success', false, 'error', 'Invalid permission id');
  end if;
  if coalesce(p_extra, '{}'::text[]) && coalesce(p_removed, '{}'::text[]) then
    return jsonb_build_object('success', false, 'error', 'A permission cannot be both added and removed');
  end if;

  v_extra := array(select distinct x from unnest(coalesce(p_extra, '{}'::text[])) x order by x);
  v_removed := array(select distinct x from unnest(coalesce(p_removed, '{}'::text[])) x order by x);

  insert into public.admin_access (user_id, extra_permissions, removed_permissions, updated_at)
  values (p_user_id, v_extra, v_removed, now())
  on conflict (user_id) do update set
    extra_permissions = excluded.extra_permissions,
    removed_permissions = excluded.removed_permissions,
    updated_at = now();

  insert into public.audit_logs (user_id, action, resource_type, resource_id, changes)
  values (auth.uid(), 'set_admin_permissions', 'profile', p_user_id,
          jsonb_build_object('extra', v_extra, 'removed', v_removed));

  return jsonb_build_object('success', true);
end;
$fn$;

-- Admin records their own last-active time (throttled to once per 5 minutes)
create or replace function public.admin_touch_last_active()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then
    return;
  end if;
  if not exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and (is_admin = true or role in ('super_admin', 'admin', 'moderator', 'support_agent', 'analyst'))
  ) then
    return;
  end if;

  insert into public.admin_access (user_id, last_active_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set last_active_at = now()
  where public.admin_access.last_active_at is null
     or public.admin_access.last_active_at < now() - interval '5 minutes';
end;
$fn$;

revoke all on function public.admin_suspend(uuid, text) from public, anon;
revoke all on function public.admin_reactivate(uuid) from public, anon;
revoke all on function public.admin_set_permissions(uuid, text[], text[]) from public, anon;
revoke all on function public.admin_touch_last_active() from public, anon;
grant execute on function public.admin_suspend(uuid, text) to authenticated, service_role;
grant execute on function public.admin_reactivate(uuid) to authenticated, service_role;
grant execute on function public.admin_set_permissions(uuid, text[], text[]) to authenticated, service_role;
grant execute on function public.admin_touch_last_active() to authenticated, service_role;