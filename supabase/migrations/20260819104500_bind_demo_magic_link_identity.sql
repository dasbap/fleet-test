begin;

create or replace function public.demo_create_magic_link(
  p_user_id uuid,
  p_fleet_id uuid,
  p_email text,
  p_label text default null,
  p_expires_at timestamptz default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
  v_link_id uuid;
  v_expires timestamptz;
  v_profile record;
  v_email text;
begin
  select
    dp.fleet_id,
    dp.expires_at,
    coalesce(nullif(trim(dp.email), ''), u.email) as email
  into v_profile
  from public.demo_profiles dp
  join auth.users u on u.id = dp.user_id
  where dp.user_id = p_user_id
    and dp.is_active = true
    and (dp.expires_at is null or dp.expires_at > now());

  if not found then
    return jsonb_build_object('ok', false, 'error', 'account_inactive');
  end if;

  v_email := lower(trim(coalesce(v_profile.email, '')));
  if v_email = '' or lower(trim(coalesce(p_email, ''))) <> v_email then
    return jsonb_build_object('ok', false, 'error', 'identity_mismatch');
  end if;

  if p_fleet_id is not null and p_fleet_id is distinct from v_profile.fleet_id then
    return jsonb_build_object('ok', false, 'error', 'fleet_mismatch');
  end if;

  update public.demo_magic_links
  set is_active = false
  where user_id = p_user_id
    and is_active = true;

  v_token := gen_random_uuid();
  v_expires := coalesce(
    p_expires_at,
    least(
      now() + interval '30 days',
      coalesce(v_profile.expires_at, now() + interval '30 days')
    )
  );

  if v_expires <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_expiration');
  end if;

  insert into public.demo_magic_links (
    token,
    user_id,
    fleet_id,
    email,
    label,
    expires_at,
    created_by
  )
  values (
    v_token,
    p_user_id,
    v_profile.fleet_id,
    v_email,
    nullif(left(coalesce(p_label, ''), 200), ''),
    v_expires,
    p_created_by
  )
  returning id into v_link_id;

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'link_id', v_link_id,
    'expires_at', v_expires
  );
end;
$$;

revoke all on function public.demo_create_magic_link(uuid, uuid, text, text, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.demo_create_magic_link(uuid, uuid, text, text, timestamptz, uuid)
  to service_role;

notify pgrst, 'reload schema';

commit;
