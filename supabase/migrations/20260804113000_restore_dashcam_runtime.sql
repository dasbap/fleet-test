-- Restore dashcam runtime objects expected by the application.

do $$
begin
  create type public.dashcam_brand as enum ('generic_rtsp', 'hikvision', 'dahua', '4g_lte', 'other');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.dashcam_alert_type as enum (
    'fatigue',
    'phone_use',
    'distraction',
    'lane_departure',
    'tailgating',
    'harsh_braking',
    'speeding',
    'smoking'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.dashcam_alert_severity as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null;
end $$;

create table if not exists public.dashcams (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  vehicle_id uuid references public.vehicules(id) on delete set null,
  name text not null,
  brand public.dashcam_brand not null default 'generic_rtsp',
  stream_url text,
  api_endpoint text,
  api_key_hash text,
  channel smallint default 1,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  firmware_ver text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashcams
  add column if not exists fleet_id uuid references public.flottes(id) on delete cascade,
  add column if not exists vehicle_id uuid references public.vehicules(id) on delete set null,
  add column if not exists name text,
  add column if not exists brand public.dashcam_brand default 'generic_rtsp',
  add column if not exists stream_url text,
  add column if not exists api_endpoint text,
  add column if not exists api_key_hash text,
  add column if not exists channel smallint default 1,
  add column if not exists is_active boolean default true,
  add column if not exists last_seen_at timestamptz,
  add column if not exists firmware_ver text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.dashcams
  alter column id set default gen_random_uuid(),
  alter column brand set default 'generic_rtsp',
  alter column channel set default 1,
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.dashcam_alerts (
  id uuid primary key default gen_random_uuid(),
  dashcam_id uuid not null references public.dashcams(id) on delete cascade,
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  vehicle_id uuid references public.vehicules(id) on delete set null,
  driver_user_id uuid references public.profils(user_id) on delete set null,
  alert_type public.dashcam_alert_type not null,
  severity public.dashcam_alert_severity not null default 'medium',
  confidence numeric(4,3) not null default 0.8,
  snapshot_url text,
  video_clip_url text,
  gps_lat numeric(10,7),
  gps_lon numeric(10,7),
  speed_kmh numeric(5,1),
  ai_provider text default 'rule-based',
  ai_raw_response jsonb,
  acknowledged boolean not null default false,
  ack_by uuid references auth.users(id) on delete set null,
  ack_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.dashcam_alerts
  add column if not exists dashcam_id uuid references public.dashcams(id) on delete cascade,
  add column if not exists fleet_id uuid references public.flottes(id) on delete cascade,
  add column if not exists vehicle_id uuid references public.vehicules(id) on delete set null,
  add column if not exists driver_user_id uuid references public.profils(user_id) on delete set null,
  add column if not exists alert_type public.dashcam_alert_type,
  add column if not exists severity public.dashcam_alert_severity default 'medium',
  add column if not exists confidence numeric(4,3) default 0.8,
  add column if not exists snapshot_url text,
  add column if not exists video_clip_url text,
  add column if not exists gps_lat numeric(10,7),
  add column if not exists gps_lon numeric(10,7),
  add column if not exists speed_kmh numeric(5,1),
  add column if not exists ai_provider text default 'rule-based',
  add column if not exists ai_raw_response jsonb,
  add column if not exists acknowledged boolean default false,
  add column if not exists ack_by uuid references auth.users(id) on delete set null,
  add column if not exists ack_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table public.dashcam_alerts
  alter column id set default gen_random_uuid(),
  alter column severity set default 'medium',
  alter column confidence set default 0.8,
  alter column ai_provider set default 'rule-based',
  alter column acknowledged set default false,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'dashcam_alerts_confidence_range'
       and conrelid = 'public.dashcam_alerts'::regclass
  ) then
    alter table public.dashcam_alerts
      add constraint dashcam_alerts_confidence_range check (confidence between 0 and 1);
  end if;
end $$;

create index if not exists idx_dashcams_fleet on public.dashcams(fleet_id);
create index if not exists idx_dashcams_vehicle on public.dashcams(vehicle_id) where vehicle_id is not null;
create index if not exists idx_dashcams_active on public.dashcams(fleet_id, is_active) where is_active = true;

create index if not exists idx_dashcam_alerts_fleet_created
  on public.dashcam_alerts(fleet_id, created_at desc);
create index if not exists idx_dashcam_alerts_vehicle
  on public.dashcam_alerts(vehicle_id, created_at desc) where vehicle_id is not null;
create index if not exists idx_dashcam_alerts_driver
  on public.dashcam_alerts(driver_user_id, created_at desc) where driver_user_id is not null;
create index if not exists idx_dashcam_alerts_type_severity
  on public.dashcam_alerts(alert_type, severity, created_at desc);
create index if not exists idx_dashcam_alerts_unack
  on public.dashcam_alerts(fleet_id, acknowledged) where acknowledged = false;

alter table public.dashcams enable row level security;
alter table public.dashcam_alerts enable row level security;

drop policy if exists dashcams_fleet_select on public.dashcams;
create policy dashcams_fleet_select
  on public.dashcams
  for select
  to authenticated
  using (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    or public.has_role(fleet_id, 'manager'::public.role_type)
    or public.has_role(fleet_id, 'mechanic'::public.role_type)
  );

drop policy if exists dashcams_fleet_write on public.dashcams;
create policy dashcams_fleet_write
  on public.dashcams
  for all
  to authenticated
  using (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    or public.has_role(fleet_id, 'manager'::public.role_type)
  )
  with check (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    or public.has_role(fleet_id, 'manager'::public.role_type)
  );

drop policy if exists dashcam_alerts_fleet_select on public.dashcam_alerts;
create policy dashcam_alerts_fleet_select
  on public.dashcam_alerts
  for select
  to authenticated
  using (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    or public.has_role(fleet_id, 'manager'::public.role_type)
    or public.has_role(fleet_id, 'mechanic'::public.role_type)
    or (public.has_role(fleet_id, 'driver'::public.role_type) and auth.uid() = driver_user_id)
  );

drop policy if exists dashcam_alerts_service_insert on public.dashcam_alerts;
create policy dashcam_alerts_service_insert
  on public.dashcam_alerts
  for insert
  to service_role
  with check (true);

drop policy if exists dashcam_alerts_ack_update on public.dashcam_alerts;
create policy dashcam_alerts_ack_update
  on public.dashcam_alerts
  for update
  to authenticated
  using (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    or public.has_role(fleet_id, 'manager'::public.role_type)
  )
  with check (
    public.has_role(fleet_id, 'organizer'::public.role_type)
    or public.has_role(fleet_id, 'manager'::public.role_type)
  );

create or replace view public.v_dashcam_alerts_24h
with (security_invoker = true)
as
select
  da.fleet_id,
  da.vehicle_id,
  da.driver_user_id,
  da.alert_type,
  da.severity,
  count(*) as alert_count,
  max(da.created_at) as last_alert_at,
  bool_or(not da.acknowledged) as has_unacknowledged
from public.dashcam_alerts da
where da.created_at >= now() - interval '24 hours'
group by da.fleet_id, da.vehicle_id, da.driver_user_id, da.alert_type, da.severity;

grant select, insert, update on public.dashcams to authenticated;
grant select, update on public.dashcam_alerts to authenticated;
grant select, insert, update on public.dashcams to service_role;
grant select, insert, update on public.dashcam_alerts to service_role;
grant select on public.v_dashcam_alerts_24h to authenticated;

notify pgrst, 'reload schema';
