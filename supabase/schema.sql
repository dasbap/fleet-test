-- =====================================================
-- E-SAMBA DATABASE SCHEMA v2
-- Execute this SQL in your Supabase SQL Editor
-- =====================================================

-- EXT
create extension if not exists pgcrypto;

-- ENUMS
create type role_type as enum ('organizer','manager','driver','mechanic');
create type vehicle_status as enum ('ok','blocked');
create type closure_status as enum ('pending','validated','rejected');

-- TENANCY
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null default 'CM',
  created_at timestamptz not null default now()
);

create table fleets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  collection_policy text not null default 'mix', -- cash|momo|mix
  created_at timestamptz not null default now()
);

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table fleet_memberships (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references fleets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role role_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (fleet_id, user_id, role)
);

-- INVITATIONS
create table fleet_invitations (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references fleets(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz,
  max_uses int,
  current_uses int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- VEHICLES
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references fleets(id) on delete cascade,
  registration text not null,
  brand text,
  model text,
  year int,
  current_km int not null default 0,
  status vehicle_status not null default 'ok',
  blocked_reason text,
  created_at timestamptz not null default now(),
  unique (fleet_id, registration)
);

-- ASSIGNMENTS (non simultané)
create table driver_vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references fleets(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  driver_user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index one_active_assignment_per_driver
on driver_vehicle_assignments(driver_user_id)
where is_active = true;

create unique index one_active_assignment_per_vehicle
on driver_vehicle_assignments(vehicle_id)
where is_active = true;

-- SHIFTS & CLOSURES
create table driver_shifts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references driver_vehicle_assignments(id) on delete restrict,
  km_start int not null,
  km_end int,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'open' -- open|closed
);

create table driver_shift_closures (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references driver_shifts(id) on delete cascade,
  revenue_declared int not null,
  collection_mode text not null, -- cash|momo|mix
  proof_type text not null,      -- photo|momo_ref|doc
  proof_value text not null,
  status closure_status not null default 'pending',
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (shift_id)
);

-- INCIDENTS / MAINTENANCE
create table incidents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  driver_user_id uuid not null references auth.users(id),
  severity text not null default 'medium',
  description text not null,
  evidence_path text,
  created_at timestamptz not null default now()
);

create table maintenance_jobs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  fleet_id uuid not null references fleets(id) on delete cascade,
  created_from_incident_id uuid references incidents(id),
  priority text not null default 'medium',
  status text not null default 'queued', -- queued|in_progress|ready|blocked
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table maintenance_evidence (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references maintenance_jobs(id) on delete cascade,
  kind text not null, -- before|after
  file_path text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table maintenance_checklists (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references maintenance_jobs(id) on delete cascade,
  items jsonb not null,
  signed_by uuid not null references auth.users(id),
  signed_at timestamptz not null default now()
);

-- PLANS / PAYMENTS / SUBSCRIPTIONS / ENTITLEMENTS / QR
create table plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_per_vehicle int not null,     -- ex 10000 FCFA
  min_commitment_days int not null default 60,
  is_active boolean not null default true
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  provider text not null,
  amount int not null,
  currency text not null default 'XAF',
  external_ref text,
  status text not null default 'initiated', -- initiated|succeeded|failed
  idempotency_key text not null,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique(provider, idempotency_key)
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references fleets(id) on delete cascade,
  plan_id uuid not null references plans(id),
  payment_id uuid references payments(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active'
);

create table vehicle_entitlements (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  active boolean not null default true,
  unique(vehicle_id, subscription_id)
);

create table qr_tokens (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  token_hash text not null unique,
  scope text not null default 'subscription', -- subscription|debug
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

create or replace function has_role(p_fleet_id uuid, p_role role_type)
returns boolean language sql stable as $$
  select exists (
    select 1 from fleet_memberships
    where fleet_id = p_fleet_id
      and user_id = auth.uid()
      and role = p_role
      and is_active = true
  );
$$;

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- RPC: assign vehicle (atomic) + checks
create or replace function assign_vehicle(
  p_fleet_id uuid,
  p_vehicle_id uuid,
  p_driver_user_id uuid,
  p_starts_at timestamptz default now()
) returns uuid
language plpgsql security definer as $$
declare
  v_vehicle vehicles;
  v_assignment_id uuid;
begin
  select * into v_vehicle
  from vehicles
  where id = p_vehicle_id and fleet_id = p_fleet_id
  for update;

  if not found then raise exception 'vehicle_not_found'; end if;
  if v_vehicle.status = 'blocked' then raise exception 'vehicle_blocked'; end if;

  -- "pas de clôture -> pas de nouvelle affectation" pour ce véhicule
  if exists (
    select 1
    from driver_vehicle_assignments a
    join driver_shifts s on s.assignment_id = a.id
    left join driver_shift_closures c on c.shift_id = s.id
    where a.vehicle_id = p_vehicle_id
      and a.is_active = false
      and s.status = 'closed'
      and c.id is null
      and s.ended_at > now() - interval '7 days'
  ) then
    raise exception 'missing_closure_blocks_assignment';
  end if;

  if exists (select 1 from driver_vehicle_assignments where driver_user_id = p_driver_user_id and is_active = true)
  then raise exception 'driver_already_assigned'; end if;

  insert into driver_vehicle_assignments(fleet_id, vehicle_id, driver_user_id, starts_at, created_by)
  values (p_fleet_id, p_vehicle_id, p_driver_user_id, p_starts_at, auth.uid())
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;

-- RPC: close shift
create or replace function close_shift(
  p_shift_id uuid,
  p_km_end int,
  p_revenue_declared int,
  p_collection_mode text,
  p_proof_type text,
  p_proof_value text
) returns void
language plpgsql security definer as $$
begin
  update driver_shifts
    set km_end = p_km_end, ended_at = now(), status = 'closed'
  where id = p_shift_id;

  insert into driver_shift_closures(shift_id, revenue_declared, collection_mode, proof_type, proof_value)
  values (p_shift_id, p_revenue_declared, p_collection_mode, p_proof_type, p_proof_value)
  on conflict (shift_id) do update
    set revenue_declared = excluded.revenue_declared,
        collection_mode = excluded.collection_mode,
        proof_type = excluded.proof_type,
        proof_value = excluded.proof_value,
        status = 'pending';
end;
$$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table fleet_memberships enable row level security;
alter table vehicles enable row level security;
alter table driver_vehicle_assignments enable row level security;
alter table driver_shifts enable row level security;
alter table driver_shift_closures enable row level security;
alter table incidents enable row level security;
alter table maintenance_jobs enable row level security;
alter table maintenance_evidence enable row level security;
alter table maintenance_checklists enable row level security;
alter table subscriptions enable row level security;
alter table vehicle_entitlements enable row level security;
alter table qr_tokens enable row level security;

-- VEHICLES policies
create policy vehicles_read_manager_org on vehicles
for select using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy vehicles_write_manager_org on vehicles
for insert with check (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy vehicles_update_manager_org on vehicles
for update using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy vehicles_read_driver_assigned on vehicles
for select using (
  exists (
    select 1 from driver_vehicle_assignments a
    where a.vehicle_id = vehicles.id
      and a.driver_user_id = auth.uid()
      and a.is_active = true
  )
);

-- ASSIGNMENTS policies
create policy assignments_create_manager_org on driver_vehicle_assignments
for insert with check (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy assignments_read_manager_org on driver_vehicle_assignments
for select using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy assignments_read_driver_self on driver_vehicle_assignments
for select using (driver_user_id = auth.uid());

-- SHIFTS policies
create policy shifts_driver_select on driver_shifts
for select using (
  exists (
    select 1 from driver_vehicle_assignments a
    where a.id = driver_shifts.assignment_id
      and a.driver_user_id = auth.uid()
  )
);

create policy shifts_driver_insert on driver_shifts
for insert with check (
  exists (
    select 1 from driver_vehicle_assignments a
    where a.id = driver_shifts.assignment_id
      and a.driver_user_id = auth.uid()
      and a.is_active = true
  )
);

create policy shifts_manager_org_select on driver_shifts
for select using (
  exists (
    select 1 from driver_vehicle_assignments a
    where a.id = driver_shifts.assignment_id
      and (has_role(a.fleet_id,'manager') or has_role(a.fleet_id,'organizer'))
  )
);

-- CLOSURES policies
create policy closures_driver_insert on driver_shift_closures
for insert with check (
  exists (
    select 1
    from driver_shifts s
    join driver_vehicle_assignments a on a.id = s.assignment_id
    where s.id = driver_shift_closures.shift_id
      and a.driver_user_id = auth.uid()
  )
);

create policy closures_manager_update on driver_shift_closures
for update using (
  exists (
    select 1
    from driver_shifts s
    join driver_vehicle_assignments a on a.id = s.assignment_id
    where s.id = driver_shift_closures.shift_id
      and (has_role(a.fleet_id,'manager') or has_role(a.fleet_id,'organizer'))
  )
);

-- INCIDENTS policies
create policy incidents_read_fleet on incidents
for select using (
  exists (
    select 1 from vehicles v
    where v.id = incidents.vehicle_id
      and (has_role(v.fleet_id,'manager') or has_role(v.fleet_id,'organizer') or has_role(v.fleet_id,'mechanic'))
  )
);

create policy incidents_driver_insert on incidents
for insert with check (driver_user_id = auth.uid());

create policy incidents_driver_select on incidents
for select using (driver_user_id = auth.uid());

-- MAINTENANCE: mechanic+manager+org read; mechanic writes evidence/checklist
create policy jobs_read_mgr_org_mech on maintenance_jobs
for select using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer') or has_role(fleet_id,'mechanic'));

create policy evidence_insert_mech on maintenance_evidence
for insert with check (true); -- restreint par RLS join à durcir en v2

-- FLEET MEMBERSHIPS policies
create policy memberships_read_self on fleet_memberships
for select using (user_id = auth.uid());

create policy memberships_read_manager_org on fleet_memberships
for select using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

-- =====================================================
-- TRIGGERS FOR AUTO-PROFILE CREATION
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- TRIGGER FOR INVITATION SIGNUP (FLEET MEMBERSHIP)
-- =====================================================

create or replace function public.handle_invitation_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fleet_id uuid;
  v_invitation_code text;
begin
  v_fleet_id := (new.raw_user_meta_data->>'invitation_fleet_id')::uuid;
  v_invitation_code := new.raw_user_meta_data->>'invitation_code';
  
  if v_fleet_id is not null then
    -- Add user to fleet as driver
    insert into public.fleet_memberships (fleet_id, user_id, role, is_active)
    values (v_fleet_id, new.id, 'driver', true);
    
    -- Increment invitation usage counter
    if v_invitation_code is not null then
      update public.fleet_invitations 
      set current_uses = current_uses + 1 
      where code = v_invitation_code;
    end if;
  end if;
  
  return new;
end;
$$;

create trigger on_invitation_signup
  after insert on auth.users
  for each row execute function public.handle_invitation_signup();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

create index idx_vehicles_fleet_id on vehicles(fleet_id);
create index idx_vehicles_status on vehicles(status);
create index idx_incidents_vehicle_id on incidents(vehicle_id);
create index idx_driver_shifts_assignment_id on driver_shifts(assignment_id);
create index idx_fleet_memberships_user_id on fleet_memberships(user_id);
create index idx_fleet_memberships_fleet_id on fleet_memberships(fleet_id);
create index idx_maintenance_jobs_fleet_id on maintenance_jobs(fleet_id);
create index idx_maintenance_jobs_vehicle_id on maintenance_jobs(vehicle_id);
