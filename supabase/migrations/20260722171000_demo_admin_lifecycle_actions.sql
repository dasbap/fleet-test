-- Admin lifecycle actions for demo accounts:
-- - update expiration without exceeding created_at + 1 month
-- - delete a demo account completely

create or replace function public.update_demo_account_expiration(
  p_user_id uuid,
  p_updated_by uuid,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_max_expires_at timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select user_id, coalesce(email, '') as email, account_type, created_at
    into v_rec
    from public.demo_profiles
   where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'compte_introuvable');
  end if;

  if p_expires_at is null and not public.is_platform_super_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden_super_admin_required');
  end if;

  v_max_expires_at := v_rec.created_at + interval '1 month';
  if p_expires_at is not null and p_expires_at > v_max_expires_at then
    return jsonb_build_object(
      'ok', false,
      'error', 'max_demo_extension_exceeded',
      'max_expires_at', v_max_expires_at
    );
  end if;

  update public.demo_profiles
     set expires_at = p_expires_at,
         is_active = (p_expires_at is null or p_expires_at > now()),
         notified_at = null,
         deactivated_at = case when p_expires_at is not null and p_expires_at <= now() then now() else null end,
         deactivated_by = case when p_expires_at is not null and p_expires_at <= now() then p_updated_by else null end
   where user_id = p_user_id;

  update public.demo_magic_links
     set expires_at = least(expires_at, p_expires_at)
   where user_id = p_user_id
     and p_expires_at is not null
     and expires_at > p_expires_at;

  if to_regclass('public.demo_expiration_log') is not null then
    insert into public.demo_expiration_log (
      user_id,
      email,
      account_type,
      action,
      reason,
      performed_by
    )
    values (
      v_rec.user_id,
      v_rec.email,
      v_rec.account_type,
      case when p_expires_at is not null and p_expires_at <= now() then 'manually_deactivated' else 'reactivated' end,
      'expiration updated by platform admin',
      p_updated_by
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'expires_at', p_expires_at,
    'max_expires_at', v_max_expires_at
  );
end;
$$;

create or replace function public.delete_demo_account(
  p_user_id uuid,
  p_deleted_by uuid,
  p_reason text default 'suppression manuelle'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rec record;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select user_id, coalesce(email, '') as email, account_type
    into v_rec
    from public.demo_profiles
   where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'compte_introuvable');
  end if;

  delete from public.flotte_adhesions
   where user_id = p_user_id;

  if to_regclass('public.demo_magic_links') is not null then
    delete from public.demo_magic_links
     where user_id = p_user_id;
  end if;

  if to_regclass('public.demo_onboarding_logs') is not null then
    delete from public.demo_onboarding_logs
     where user_id = p_user_id;
  end if;

  if to_regclass('public.demo_expiration_log') is not null then
    delete from public.demo_expiration_log
     where user_id = p_user_id;
  end if;

  if to_regclass('public.demo_audit_logs') is not null then
    delete from public.demo_audit_logs
     where user_id = p_user_id;
  end if;

  delete from public.demo_profiles
   where user_id = p_user_id;

  delete from auth.users
   where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'deleted_by', p_deleted_by,
    'reason', p_reason
  );
end;
$$;

grant execute on function public.update_demo_account_expiration(uuid, uuid, timestamptz) to authenticated;
revoke execute on function public.update_demo_account_expiration(uuid, uuid, timestamptz) from anon;

grant execute on function public.delete_demo_account(uuid, uuid, text) to authenticated;
revoke execute on function public.delete_demo_account(uuid, uuid, text) from anon;

notify pgrst, 'reload schema';
