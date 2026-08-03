-- Fix admin demo listings so created demo accounts keep their email and finite expiration visible.

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
      coalesce(
        dp.expires_at,
        ml.expires_at,
        dp.created_at + (public.get_demo_account_type_duration(dp.account_type) || ' hours')::interval
      ) as expires_at,
      dp.notified_at,
      dp.deactivated_at,
      dp.created_at
    from public.demo_profiles dp
    left join auth.users u on u.id = dp.user_id
    left join lateral (
      select dml.email, dml.expires_at
        from public.demo_magic_links dml
       where dml.user_id = dp.user_id
       order by dml.is_active desc, dml.created_at desc
       limit 1
    ) ml on true
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
        coalesce(
          dp.expires_at,
          ml.expires_at,
          dp.created_at + (public.get_demo_account_type_duration(dp.account_type) || ' hours')::interval
        ) as expires_at,
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
    ) s;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function public.list_demo_profiles() to authenticated;
revoke execute on function public.list_demo_profiles() from anon;
grant execute on function public.admin_list_demo_sessions(boolean) to authenticated;
revoke execute on function public.admin_list_demo_sessions(boolean) from anon;

notify pgrst, 'reload schema';
