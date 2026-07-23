-- Replaces delete_demo_account on already-migrated databases so manual demo
-- deletion clears audit rows before removing the auth/public user.

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

grant execute on function public.delete_demo_account(uuid, uuid, text) to authenticated;
revoke execute on function public.delete_demo_account(uuid, uuid, text) from anon;

notify pgrst, 'reload schema';
