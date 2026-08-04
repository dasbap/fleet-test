-- Allow demo onboarding triggers to audit the admin who provisioned the account.
-- The caller may be the demo user, but p_admin_user_id must be an active platform admin.

create or replace function public.admin_log_action(
  p_admin_user_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_target_label text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_id uuid;
  v_admin_actor_is_valid boolean := false;
begin
  if p_admin_user_id is not null then
    select exists (
      select 1
      from public.admin_profiles ap
      where ap.user_id = p_admin_user_id
        and coalesce(ap.is_active, true)
    )
    into v_admin_actor_is_valid;
  end if;

  if auth.uid() is not null
     and not public.support_current_user_is_admin()
     and not v_admin_actor_is_valid then
    raise exception 'forbidden';
  end if;

  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    target_type,
    target_id,
    target_label,
    metadata
  )
  values (
    p_admin_user_id,
    p_action,
    coalesce(nullif(trim(p_target_type), ''), 'admin_panel'),
    p_target_id,
    nullif(trim(coalesce(p_target_label, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.admin_log_action(uuid, text, text, uuid, text, jsonb) to authenticated, service_role;
revoke execute on function public.admin_log_action(uuid, text, text, uuid, text, jsonb) from anon;

notify pgrst, 'reload schema';
