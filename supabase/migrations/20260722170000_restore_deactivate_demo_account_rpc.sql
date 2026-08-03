-- Restore the RPC used by the admin demo panel to suspend demo accounts.

create or replace function public.deactivate_demo_account(
  p_user_id uuid,
  p_deactivated_by uuid,
  p_reason text default 'desactivation manuelle'
)
returns jsonb
language plpgsql
security definer
set search_path = public
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

  update public.demo_profiles
     set is_active = false,
         deactivated_at = now(),
         deactivated_by = p_deactivated_by
   where user_id = p_user_id;

  update public.demo_magic_links
     set is_active = false
   where user_id = p_user_id
     and is_active = true;

  delete from public.flotte_adhesions fa
   where fa.user_id = p_user_id
     and exists (
       select 1
         from public.demo_profiles dp
        where dp.user_id = p_user_id
     );

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
      'manually_deactivated',
      p_reason,
      p_deactivated_by
    );
  end if;

  return jsonb_build_object('ok', true, 'user_id', p_user_id);
end;
$$;

grant execute on function public.deactivate_demo_account(uuid, uuid, text) to authenticated;
revoke execute on function public.deactivate_demo_account(uuid, uuid, text) from anon;

notify pgrst, 'reload schema';
