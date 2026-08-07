import pg from "pg";

const { Client } = pg;

const connectionString =
  process.env.DOCKER_TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55432/postgres";

const adminId = "00000000-0000-0000-0000-0000000000a1";
const demoId = "00000000-0000-0000-0000-0000000000d1";

const sql = `
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema if not exists public;

drop table if exists public.admin_audit_logs cascade;
drop table if exists public.abonnements cascade;
drop table if exists public.flotte_adhesions cascade;
drop table if exists public.demo_profiles cascade;
drop table if exists public.flottes cascade;
drop table if exists public.organisations cascade;
drop table if exists public.plans cascade;
drop table if exists public.admin_profiles cascade;
drop type if exists public.role_type cascade;

create type public.role_type as enum ('organizer', 'manager', 'driver', 'mechanic');

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id),
  is_active boolean not null default true
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text
);

create table public.flottes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  collection_policy text,
  is_demo boolean not null default false
);

create table public.flotte_adhesions (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.role_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_per_vehicle int not null,
  min_commitment_days int not null default 60,
  is_active boolean not null default true,
  max_vehicles integer,
  enables_finance boolean not null default false,
  enables_ai boolean not null default false
);

create table public.abonnements (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  payment_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active',
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null
);

create table public.demo_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  demo_role text not null default 'organizer',
  fleet_id uuid references public.flottes(id) on delete set null,
  is_active boolean not null default true,
  expires_at timestamptz,
  account_type text not null default 'prospect',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into auth.users (id, email)
values ('${adminId}', 'admin@example.test'), ('${demoId}', 'demo@example.test')
on conflict (id) do update set email = excluded.email;

insert into public.admin_profiles (user_id, is_active)
values ('${adminId}', true)
on conflict (user_id) do update set is_active = excluded.is_active;

insert into public.plans (code, name, price_per_vehicle, min_commitment_days, is_active, max_vehicles, enables_finance, enables_ai)
values ('pro', 'Pro', 25000, 60, true, 75, true, true)
on conflict (code) do update set is_active = true;

insert into public.demo_profiles (user_id, email, demo_role, is_active, account_type, created_by)
values ('${demoId}', 'demo@example.test', 'organizer', true, 'prospect', '${adminId}')
on conflict (user_id) do update
set demo_role = excluded.demo_role,
    is_active = excluded.is_active,
    created_by = excluded.created_by;

create or replace function public.support_current_user_is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and coalesce(ap.is_active, true)
  );
end;
$$;

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

  insert into public.admin_audit_logs (admin_user_id, action, target_type, target_id, target_label, metadata)
  values (p_admin_user_id, p_action, coalesce(nullif(trim(p_target_type), ''), 'admin_panel'), p_target_id, nullif(trim(coalesce(p_target_label, '')), ''), coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_apply_fleet_plan_internal(
  p_fleet_id uuid,
  p_plan_code text,
  p_admin_user_id uuid default null,
  p_reason text default null,
  p_replace_existing boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan_id uuid;
  v_current record;
  v_subscription_id uuid;
  v_plan_code text := lower(trim(p_plan_code));
begin
  select id into v_plan_id
    from public.plans
   where code = v_plan_code
     and coalesce(is_active, true) = true
   limit 1;

  if v_plan_id is null then
    raise exception 'plan_not_found:%', v_plan_code;
  end if;

  select a.id, p.code
    into v_current
    from public.abonnements a
    join public.plans p on p.id = a.plan_id
   where a.fleet_id = p_fleet_id
     and a.status in ('active', 'trial')
     and (a.ends_at is null or a.ends_at > now())
   order by a.starts_at desc nulls last, a.id desc
   limit 1;

  if v_current.id is not null and not p_replace_existing then
    return jsonb_build_object('ok', true, 'kept_existing_plan', true);
  end if;

  update public.abonnements
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = p_admin_user_id,
         ends_at = least(coalesce(ends_at, now()), now())
   where fleet_id = p_fleet_id
     and status in ('active', 'trial')
     and (ends_at is null or ends_at > now());

  insert into public.abonnements (fleet_id, plan_id, payment_id, starts_at, ends_at, status)
  values (p_fleet_id, v_plan_id, null, now(), now() + interval '1 year', 'active')
  returning id into v_subscription_id;

  perform public.admin_log_action(
    p_admin_user_id,
    case when p_replace_existing then 'fleet_plan_changed' else 'fleet_plan_defaulted' end,
    'fleet',
    p_fleet_id,
    v_plan_code,
    jsonb_build_object('plan_code', v_plan_code, 'reason', p_reason, 'subscription_id', v_subscription_id)
  );

  return jsonb_build_object('ok', true, 'plan_code', v_plan_code, 'subscription_id', v_subscription_id);
end;
$$;

create or replace function public.demo_organizer_role_before_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
      from public.demo_profiles dp
     where dp.user_id = new.user_id
       and dp.is_active = true
       and dp.demo_role = 'organizer'
  ) then
    new.role := 'organizer'::public.role_type;
  end if;

  return new;
end;
$$;

create trigger demo_organizer_default_role_before_membership
  before insert or update on public.flotte_adhesions
  for each row execute function public.demo_organizer_role_before_membership();

create or replace function public.demo_organizer_plan_after_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid;
begin
  select dp.created_by
    into v_created_by
    from public.demo_profiles dp
   where dp.user_id = new.user_id
     and dp.is_active = true
     and dp.demo_role = 'organizer'
   limit 1;

  if found then
    update public.demo_profiles
       set fleet_id = coalesce(fleet_id, new.fleet_id)
     where user_id = new.user_id;

    perform public.admin_apply_fleet_plan_internal(
      new.fleet_id,
      'pro',
      v_created_by,
      'default_plan_code',
      false
    );
  end if;

  return new;
end;
$$;

create trigger demo_organizer_plan_after_membership
  after insert or update on public.flotte_adhesions
  for each row execute function public.demo_organizer_plan_after_membership();

create or replace function public.creer_flotte_esamba(
  p_org_id uuid,
  p_name text,
  p_collection_policy text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.flottes (org_id, name, collection_policy)
  values (p_org_id, p_name, p_collection_policy)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.creer_ou_mettre_a_jour_adhesion_flotte(
  p_fleet_id uuid,
  p_user_id uuid,
  p_role public.role_type,
  p_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.flotte_adhesions (fleet_id, user_id, role, is_active)
  values (p_fleet_id, p_user_id, p_role, p_is_active)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.creer_onboarding_organisation_flotte_et_adhesion(
  p_org_name text,
  p_country_code text,
  p_fleet_name text,
  p_collection_policy text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_fleet_id uuid;
begin
  if v_user_id is null then
    raise exception 'non_authentifie';
  end if;

  insert into public.organisations (name, country_code)
  values (trim(p_org_name), upper(trim(p_country_code)))
  returning id into v_org_id;

  v_fleet_id := public.creer_flotte_esamba(v_org_id, trim(p_fleet_name), trim(p_collection_policy));

  perform public.creer_ou_mettre_a_jour_adhesion_flotte(v_fleet_id, v_user_id, 'organizer'::public.role_type, true);

  return jsonb_build_object('org_id', v_org_id, 'fleet_id', v_fleet_id);
end;
$$;

begin;
set local request.jwt.claim.sub = '${demoId}';
select public.creer_onboarding_organisation_flotte_et_adhesion(
  'Organisation Docker',
  'CM',
  'Flotte Docker',
  'standard'
) as result;
commit;

select
  (select count(*)::int from public.flottes) as fleets,
  (select count(*)::int from public.flotte_adhesions where user_id = '${demoId}' and role = 'organizer') as organizer_memberships,
  (select p.code from public.abonnements a join public.plans p on p.id = a.plan_id order by a.starts_at desc limit 1) as plan_code,
  (select count(*)::int from public.admin_audit_logs where admin_user_id = '${adminId}' and action = 'fleet_plan_defaulted') as audit_entries;
`;

if (process.argv.includes("--print-sql")) {
  console.log(sql);
  process.exit(0);
}

const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(sql);
  const { rows } = await client.query(`
    select
      (select count(*)::int from public.flottes) as fleets,
      (select count(*)::int from public.flotte_adhesions where user_id = $1 and role = 'organizer') as organizer_memberships,
      (select p.code from public.abonnements a join public.plans p on p.id = a.plan_id order by a.starts_at desc limit 1) as plan_code,
      (select count(*)::int from public.admin_audit_logs where admin_user_id = $2 and action = 'fleet_plan_defaulted') as audit_entries
  `, [demoId, adminId]);
  console.log(JSON.stringify(rows[0], null, 2));
} finally {
  await client.end();
}
