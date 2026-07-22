-- Super admins can create permanent demo access; regular admins cannot list it.

drop function if exists public.prospect_create_account(uuid, text, text, uuid, uuid, int, text);

create or replace function public.prospect_create_account(
  p_user_id uuid,
  p_email text,
  p_company_name text default null,
  p_invited_by uuid default null,
  p_fleet_id uuid default null,
  p_trial_days int default 7,
  p_account_type text default 'prospect',
  p_permanent_access boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fleet_id uuid;
  v_reg_id uuid;
  v_trial_end timestamptz;
  v_account_type text;
begin
  v_account_type := coalesce(nullif(p_account_type, ''), 'prospect');

  if v_account_type not in ('prospect', 'investor', 'internal', 'dev') then
    return jsonb_build_object('ok', false, 'error', 'invalid_account_type');
  end if;

  if p_trial_days < 1 or p_trial_days > 90 then
    return jsonb_build_object('ok', false, 'error', 'trial_days_must_be_1_to_90');
  end if;

  if p_fleet_id is not null then
    v_fleet_id := p_fleet_id;
  else
    select id
      into v_fleet_id
      from public.flottes
     where is_demo = true
     order by id
     limit 1;
  end if;

  if v_fleet_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_demo_fleet_available');
  end if;

  if not exists (
    select 1 from public.flottes where id = v_fleet_id and is_demo = true
  ) then
    raise exception 'not_a_demo_fleet: fleet_id % is not a demo fleet', v_fleet_id
      using errcode = 'P0001';
  end if;

  v_trial_end := case when p_permanent_access then null else now() + (p_trial_days || ' days')::interval end;

  insert into public.demo_profiles (
    user_id,
    email,
    demo_role,
    fleet_id,
    is_active,
    expires_at,
    account_type,
    created_by,
    deactivated_at,
    deactivated_by,
    notified_at
  )
  values (
    p_user_id,
    p_email,
    'driver',
    v_fleet_id,
    true,
    v_trial_end,
    v_account_type,
    p_invited_by,
    null,
    null,
    null
  )
  on conflict (user_id) do update
    set email = excluded.email,
        demo_role = excluded.demo_role,
        fleet_id = excluded.fleet_id,
        is_active = true,
        expires_at = excluded.expires_at,
        account_type = excluded.account_type,
        created_by = coalesce(public.demo_profiles.created_by, excluded.created_by),
        deactivated_at = null,
        deactivated_by = null,
        notified_at = null;

  insert into public.flotte_adhesions (user_id, fleet_id, role, is_active)
  values (p_user_id, v_fleet_id, 'driver', true)
  on conflict (user_id, fleet_id) do update
    set role = 'driver',
        is_active = true;

  if to_regclass('public.prospect_registrations') is not null then
    insert into public.prospect_registrations (
      user_id,
      fleet_id,
      email,
      company_name,
      invited_by,
      trial_end,
      status
    )
    values (
      p_user_id,
      v_fleet_id,
      p_email,
      p_company_name,
      p_invited_by,
      v_trial_end,
      'active'
    )
    returning id into v_reg_id;
  end if;

  if to_regprocedure('public.demo_log_action(uuid,uuid,text,jsonb)') is not null then
    perform public.demo_log_action(
      p_user_id,
      null,
      'prospect_created',
      jsonb_build_object(
        'fleet_id', v_fleet_id,
        'email', p_email,
        'company', p_company_name,
        'account_type', v_account_type,
        'trial_end', v_trial_end,
        'permanent_access', p_permanent_access,
        'invited_by', p_invited_by
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'fleet_id', v_fleet_id,
    'reg_id', v_reg_id,
    'trial_end', v_trial_end,
    'account_type', v_account_type,
    'permanent_access', p_permanent_access
  );
end;
$$;

grant execute on function public.prospect_create_account(uuid, text, text, uuid, uuid, int, text, boolean) to service_role;

create or replace function public.list_demo_profiles()
returns table (
  user_id uuid,
  email text,
  account_type text,
  is_active boolean,
  expires_at timestamptz,
  notified_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acces refuse : reserve aux admins plateforme';
  end if;

  return query
    select
      dp.user_id,
      coalesce(nullif(dp.email, ''), u.email, ml.email, 'email indisponible') as email,
      dp.account_type::text,
      dp.is_active,
      dp.expires_at,
      dp.notified_at,
      dp.deactivated_at,
      dp.created_at
    from public.demo_profiles dp
    left join auth.users u on u.id = dp.user_id
    left join lateral (
      select dml.email
        from public.demo_magic_links dml
       where dml.user_id = dp.user_id
       order by dml.is_active desc, dml.created_at desc
       limit 1
    ) ml on true
   where public.is_platform_super_admin() or dp.expires_at is not null
   order by dp.created_at desc;
end;
$$;

create or replace function public.admin_list_demo_sessions(p_active_only boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select jsonb_agg(row_to_json(s) order by s.created_at desc)
    into v_result
    from (
      select
        dp.user_id,
        coalesce(nullif(dp.email, ''), u.email, ml.email, 'email indisponible') as email,
        dp.account_type,
        dp.demo_role,
        dp.is_active,
        dp.expires_at,
        dp.created_at,
        dp.deactivated_at,
        dp.last_login,
        dp.last_activity_at,
        dp.notes,
        dp.fleet_id,
        fl.name as fleet_name,
        ml.token as magic_link_token,
        ml.label as magic_link_label,
        coalesce(ml.used_count, 0) as used_count,
        ml.last_used_at,
        ml.expires_at as link_expires_at,
        (
          select count(*)::int
            from public.demo_onboarding_logs ol
           where ol.user_id = dp.user_id
        ) as onboarding_steps
      from public.demo_profiles dp
      left join auth.users u on u.id = dp.user_id
      left join public.flottes fl on fl.id = dp.fleet_id
      left join lateral (
        select token, email, label, used_count, last_used_at, expires_at, is_active, created_at
          from public.demo_magic_links dml
         where dml.user_id = dp.user_id
           and dml.is_active = true
         order by dml.created_at desc
         limit 1
      ) ml on true
      where (not p_active_only or dp.is_active = true)
        and (public.is_platform_super_admin() or dp.expires_at is not null)
    ) s;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function public.list_demo_profiles() to authenticated;
revoke execute on function public.list_demo_profiles() from anon;
grant execute on function public.admin_list_demo_sessions(boolean) to authenticated;
revoke execute on function public.admin_list_demo_sessions(boolean) from anon;

notify pgrst, 'reload schema';
