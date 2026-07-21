-- Restore frontend demo session runtime RPC.

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

create table if not exists public.demo_access_policies (
  role text primary key check (role in ('organizer', 'manager', 'driver', 'mechanic')),
  can_create_vehicles boolean not null default true,
  can_export_data boolean not null default false,
  can_view_billing boolean not null default false,
  can_invite_users boolean not null default false,
  can_access_reports boolean not null default true,
  can_modify_org boolean not null default false,
  max_session_hours int not null default 4,
  max_total_days int not null default 7,
  updated_at timestamptz not null default now()
);

alter table public.demo_access_policies enable row level security;

insert into public.demo_access_policies
  (role, can_create_vehicles, can_export_data, can_view_billing, can_invite_users,
   can_access_reports, can_modify_org, max_session_hours, max_total_days)
values
  ('organizer', true, false, false, false, true, false, 4, 7),
  ('manager', true, false, false, false, true, false, 4, 7),
  ('driver', false, false, false, false, false, false, 4, 7),
  ('mechanic', false, false, false, false, true, false, 4, 7)
on conflict (role) do nothing;

create table if not exists public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  is_active boolean not null default true,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  revoke_reason text check (
    revoke_reason in (
      'admin_revoke',
      'new_session_started',
      'session_expired',
      'account_expired',
      'abuse_detected',
      'manual_logout'
    )
  )
);

create index if not exists demo_sessions_user_active_idx
  on public.demo_sessions (user_id, is_active, expires_at);

create index if not exists demo_sessions_expiry_idx
  on public.demo_sessions (expires_at)
  where is_active = true;

alter table public.demo_sessions enable row level security;

create table if not exists public.demo_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  session_id uuid references public.demo_sessions(id),
  action text not null,
  resource text,
  resource_id uuid,
  status text not null check (status in ('allowed', 'blocked', 'expired', 'error')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists demo_audit_user_idx
  on public.demo_audit_logs (user_id, created_at desc);

create index if not exists demo_audit_action_idx
  on public.demo_audit_logs (action, created_at desc);

alter table public.demo_audit_logs enable row level security;

drop policy if exists demo_sessions_own_read on public.demo_sessions;
create policy demo_sessions_own_read
  on public.demo_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists demo_sessions_own_insert on public.demo_sessions;
create policy demo_sessions_own_insert
  on public.demo_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists demo_sessions_own_update on public.demo_sessions;
create policy demo_sessions_own_update
  on public.demo_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'demo_audit_logs'
       and policyname = 'demo_audit_logs_no_client_access'
  ) then
    create policy demo_audit_logs_no_client_access
      on public.demo_audit_logs
      as restrictive
      for all
      to authenticated
      using (false)
      with check (false);
  end if;
end $$;

create or replace function public.demo_session_valid()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.demo_sessions
     where user_id = auth.uid()
       and is_active = true
       and expires_at > now()
  );
$$;

grant execute on function public.demo_session_valid() to authenticated;

create or replace function public.demo_upsert_session(
  p_ip_address text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.demo_profiles%rowtype;
  v_policy public.demo_access_policies%rowtype;
  v_session public.demo_sessions%rowtype;
  v_session_id uuid;
  v_expires_at timestamptz;
begin
  select *
    into v_profile
    from public.demo_profiles
   where user_id = auth.uid()
     and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_demo_user');
  end if;

  if v_profile.expires_at is not null and v_profile.expires_at < now() then
    update public.demo_profiles
       set is_active = false,
           deactivated_at = coalesce(deactivated_at, now())
     where user_id = auth.uid();

    insert into public.demo_audit_logs (user_id, action, status, metadata)
    values (
      auth.uid(),
      'account_expired',
      'expired',
      jsonb_build_object('expires_at', v_profile.expires_at)
    );

    return jsonb_build_object('ok', false, 'error', 'demo_account_expired');
  end if;

  select *
    into v_policy
    from public.demo_access_policies
   where role = v_profile.demo_role;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_policy_for_role');
  end if;

  if v_profile.created_at + (v_policy.max_total_days || ' days')::interval < now() then
    update public.demo_profiles
       set is_active = false,
           deactivated_at = coalesce(deactivated_at, now())
     where user_id = auth.uid();

    update public.demo_sessions
       set is_active = false,
           revoked_at = now(),
           revoke_reason = 'account_expired'
     where user_id = auth.uid()
       and is_active = true;

    insert into public.demo_audit_logs (user_id, action, status, metadata)
    values (
      auth.uid(),
      'demo_period_expired',
      'expired',
      jsonb_build_object('created_at', v_profile.created_at, 'max_days', v_policy.max_total_days)
    );

    return jsonb_build_object('ok', false, 'error', 'demo_period_expired');
  end if;

  v_expires_at := now() + (v_policy.max_session_hours || ' hours')::interval;

  select *
    into v_session
    from public.demo_sessions
   where user_id = auth.uid()
     and is_active = true
     and expires_at > now()
   order by started_at desc
   limit 1;

  if found then
    update public.demo_sessions
       set last_seen_at = now()
     where id = v_session.id;

    v_session_id := v_session.id;
    v_expires_at := v_session.expires_at;
  else
    update public.demo_sessions
       set is_active = false,
           revoked_at = now(),
           revoke_reason = 'session_expired'
     where user_id = auth.uid()
       and is_active = true;

    insert into public.demo_sessions (user_id, expires_at, ip_address, user_agent)
    values (auth.uid(), v_expires_at, p_ip_address, p_user_agent)
    returning id into v_session_id;

    insert into public.demo_audit_logs (user_id, session_id, action, status, metadata)
    values (
      auth.uid(),
      v_session_id,
      'session_start',
      'allowed',
      jsonb_build_object(
        'role', v_profile.demo_role,
        'fleet_id', v_profile.fleet_id,
        'ip', p_ip_address
      )
    );
  end if;

  update public.demo_profiles
     set last_login = now(),
         last_activity_at = now()
   where user_id = auth.uid();

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'expires_at', v_expires_at,
    'fleet_id', v_profile.fleet_id,
    'demo_role', v_profile.demo_role,
    'policy', to_jsonb(v_policy) - 'updated_at'
  );
end;
$$;

comment on function public.demo_upsert_session(text, text) is
  'Creates or refreshes a demo session for the current authenticated demo user.';

grant execute on function public.demo_upsert_session(text, text) to authenticated;
grant select, insert, update on public.demo_sessions to authenticated;
grant select, insert, update on public.demo_sessions to service_role;
grant select on public.demo_access_policies to service_role;
grant insert on public.demo_audit_logs to authenticated;
grant select, insert on public.demo_audit_logs to service_role;

notify pgrst, 'reload schema';
