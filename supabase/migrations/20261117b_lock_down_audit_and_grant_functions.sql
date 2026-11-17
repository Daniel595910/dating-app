-- 1. log_audit_entry: actor is always the real caller; only admins may log.
--    Trusted contexts (SQL editor, service_role) keep working.
create or replace function public.log_audit_entry(
  p_user_id uuid,
  p_action character varying,
  p_resource_type character varying,
  p_resource_id uuid default null::uuid,
  p_changes jsonb default null::jsonb,
  p_ip_address inet default null::inet,
  p_user_agent text default null::text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_actor uuid := auth.uid();
  v_log_id uuid;
begin
  if v_actor is null then
    if coalesce(auth.role(), '') in ('anon', 'authenticated') then
      raise exception 'Not authenticated' using errcode = '42501';
    end if;
    v_actor := p_user_id;
  else
    if not exists (
      select 1 from public.profiles
      where user_id = v_actor
        and (is_admin = true
             or role in ('super_admin','admin','moderator','support_agent','analyst'))
    ) then
      raise exception 'Only admins can write audit entries' using errcode = '42501';
    end if;
  end if;

  insert into public.audit_logs (
    user_id, action, resource_type, resource_id, changes, ip_address, user_agent, created_at
  ) values (
    v_actor, p_action, p_resource_type, p_resource_id, p_changes, p_ip_address, p_user_agent, now()
  )
  returning id into v_log_id;

  return v_log_id;
end;
$fn$;

revoke all on function public.log_audit_entry(uuid, character varying, character varying, uuid, jsonb, inet, text) from public, anon;
grant execute on function public.log_audit_entry(uuid, character varying, character varying, uuid, jsonb, inet, text) to authenticated, service_role;

-- 2. grant_admin_role: NULL caller role must be rejected (NULL != 'x' is NULL, not true).
create or replace function public.grant_admin_role(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_caller_role text;
begin
  select role into v_caller_role
  from public.profiles
  where user_id = auth.uid();

  if v_caller_role is distinct from 'super_admin' then
    return jsonb_build_object('success', false, 'error', 'Only super admins can grant admin roles');
  end if;

  if p_role not in ('moderator', 'admin', 'super_admin', 'support_agent', 'analyst', 'user') then
    return jsonb_build_object('success', false, 'error', 'Invalid role');
  end if;

  update public.profiles
  set role = p_role, is_admin = (p_role in ('admin', 'super_admin', 'moderator'))
  where user_id = p_user_id;

  insert into public.audit_logs (user_id, action, resource_type, resource_id, changes)
  values (auth.uid(), 'grant_admin_role', 'profile', p_user_id, jsonb_build_object('role', p_role));

  return jsonb_build_object('success', true, 'role', p_role);
end;
$fn$;

revoke all on function public.grant_admin_role(uuid, text) from public, anon;
grant execute on function public.grant_admin_role(uuid, text) to authenticated, service_role;