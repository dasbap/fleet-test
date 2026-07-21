-- Restore admin-managed demo accounts with explicit expiration.

create table if not exists public.demo_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  demo_role text not null default 'driver'
    check (demo_role in ('organizer', 'manager', 'driver', 'mechanic')),
  fleet_id uuid references public.flottes(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  expires_at timestamptz,
  last_login timestamptz,
  notes text
);

alter table public.demo_profiles
  add column if not exists email text,
  add column if not exists account_type text not null default 'prospect'
    check (account_type in ('prospect', 'investor', 'internal', 'dev')),
  add column if not exists notified_at timestamptz,
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by uuid references auth.users(id) on delete set null,
  add column if not exists last_activity_at timestamptz;

alter table public.demo_profiles enable row level security;

create index if not exists idx_demo_profiles_expires_at
  on public.demo_profiles (expires_at)
  where is_active = true and expires_at is not null;

create table if not exists public.demo_expiration_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  account_type text not null,
  action text not null check (action in ('expired', 'reactivated', 'notified', 'manually_deactivated')),
  reason text,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.demo_expiration_log enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'demo_expiration_log'
      and policyname = 'demo_expiration_log_no_client_access'
  ) then
    create policy demo_expiration_log_no_client_access
      on public.demo_expiration_log
      as restrictive
      for all
      to authenticated
      using (false)
      with check (false);
  end if;
end $$;

create table if not exists public.demo_magic_links (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fleet_id uuid references public.flottes(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  email text not null,
  label text,
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_count int not null default 0,
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.demo_magic_links enable row level security;

create index if not exists idx_demo_magic_links_token
  on public.demo_magic_links (token)
  where is_active = true;

create index if not exists idx_demo_magic_links_user
  on public.demo_magic_links (user_id, is_active);

create table if not exists public.demo_onboarding_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  magic_link_id uuid references public.demo_magic_links(id) on delete set null,
  step int not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.demo_onboarding_logs enable row level security;

create or replace function public.get_demo_account_type_duration(p_account_type text)
returns integer
language sql
immutable
security definer
set search_path = public
as $$
  select case p_account_type
    when 'investor' then 48
    when 'prospect' then 168
    when 'internal' then 720
    when 'dev' then 720
    else 168
  end;
$$;

update public.demo_profiles dp
   set email = u.email
  from auth.users u
 where u.id = dp.user_id
   and dp.email is null;

update public.demo_profiles
   set expires_at = now() + (public.get_demo_account_type_duration(account_type) || ' hours')::interval
 where is_active = true
   and expires_at is null;

update public.demo_profiles dp
   set is_active = true,
       deactivated_at = null,
       deactivated_by = null,
       notified_at = null,
       expires_at = now() + (public.get_demo_account_type_duration(dp.account_type) || ' hours')::interval
  from auth.users u
 where u.id = dp.user_id
   and coalesce(dp.email, u.email) like 'demo.%@esamba.test';

create or replace function public.prospect_create_account(
  p_user_id uuid,
  p_email text,
  p_company_name text default null,
  p_invited_by uuid default null,
  p_fleet_id uuid default null,
  p_trial_days int default 7,
  p_account_type text default 'prospect'
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

  v_trial_end := now() + (p_trial_days || ' days')::interval;

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
    'account_type', v_account_type
  );
end;
$$;

grant execute on function public.prospect_create_account(uuid, text, text, uuid, uuid, int, text) to service_role;

create or replace function public.demo_validate_magic_link(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
begin
  select id, user_id, fleet_id, email, expires_at, is_active
    into v_link
    from public.demo_magic_links
   where token = p_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'token_not_found');
  end if;

  if not v_link.is_active then
    return jsonb_build_object('ok', false, 'error', 'token_revoked');
  end if;

  if v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'token_expired');
  end if;

  if not exists (
    select 1
    from public.demo_profiles
    where user_id = v_link.user_id
      and is_active = true
      and (expires_at is null or expires_at > now())
  ) then
    return jsonb_build_object('ok', false, 'error', 'account_inactive');
  end if;

  update public.demo_magic_links
     set used_count = used_count + 1,
         last_used_at = now()
   where id = v_link.id;

  update public.demo_profiles
     set last_activity_at = now()
   where user_id = v_link.user_id;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_link.user_id,
    'email', v_link.email,
    'fleet_id', v_link.fleet_id
  );
end;
$$;

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
begin
  if not exists (
    select 1
    from public.demo_profiles
    where user_id = p_user_id
      and is_active = true
      and (expires_at is null or expires_at > now())
  ) then
    return jsonb_build_object('ok', false, 'error', 'account_inactive');
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
      coalesce(
        (select expires_at from public.demo_profiles where user_id = p_user_id),
        now() + interval '30 days'
      )
    )
  );

  insert into public.demo_magic_links (token, user_id, fleet_id, email, label, expires_at, created_by)
  values (v_token, p_user_id, p_fleet_id, p_email, p_label, v_expires, p_created_by)
  returning id into v_link_id;

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'link_id', v_link_id,
    'expires_at', v_expires
  );
end;
$$;

create or replace function public.admin_list_demo_sessions(p_active_only boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
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
        coalesce(dp.email, u.email) as email,
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
        select token, label, used_count, last_used_at, expires_at
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

grant execute on function public.admin_list_demo_sessions(boolean) to authenticated;

create or replace function public.expire_demo_accounts_by_type()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_count integer := 0;
begin
  for v_rec in
    select user_id, coalesce(email, '') as email, account_type
      from public.demo_profiles
     where is_active = true
       and expires_at is not null
       and expires_at < now()
  loop
    update public.demo_profiles
       set is_active = false,
           deactivated_at = now()
     where user_id = v_rec.user_id;

    insert into public.demo_expiration_log (user_id, email, account_type, action, reason)
    values (v_rec.user_id, v_rec.email, v_rec.account_type, 'expired', 'expires_at passed');

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'expired_count', v_count, 'errors', '[]'::jsonb);
end;
$$;

create or replace function public.reactivate_demo_account(
  p_user_id uuid,
  p_reactivated_by uuid,
  p_extend_hours integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_duration integer;
  v_expires timestamptz;
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

  if p_extend_hours is not null then
    v_expires := now() + (p_extend_hours || ' hours')::interval;
  else
    v_duration := public.get_demo_account_type_duration(v_rec.account_type);
    v_expires := now() + (v_duration || ' hours')::interval;
  end if;

  update public.demo_profiles
     set is_active = true,
         expires_at = v_expires,
         notified_at = null,
         deactivated_at = null,
         deactivated_by = null
   where user_id = p_user_id;

  insert into public.demo_expiration_log (user_id, email, account_type, action, reason, performed_by)
  values (v_rec.user_id, v_rec.email, v_rec.account_type, 'reactivated', 'reactivated by platform admin', p_reactivated_by);

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'expires_at', v_expires);
end;
$$;

grant execute on function public.reactivate_demo_account(uuid, uuid, integer) to authenticated;
grant execute on function public.expire_demo_accounts_by_type() to service_role;
grant execute on function public.demo_validate_magic_link(uuid) to service_role;
grant execute on function public.demo_create_magic_link(uuid, uuid, text, text, timestamptz, uuid) to service_role;

notify pgrst, 'reload schema';
