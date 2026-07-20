-- Restore driver license runtime table expected by the dashboard and driver profile flows.
-- Some baseline environments include vehicle_documents but missed the historical
-- driver_licenses table from the driver scoring/documents migrations.

create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.driver_licenses (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  driver_user_id uuid not null references public.profils(user_id) on delete cascade,
  license_number text not null,
  license_category text not null,
  issued_at date,
  expires_at date,
  issuing_country text not null default 'CM',
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected', 'expired')),
  document_url text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fleet_id, driver_user_id, license_number)
);

create index if not exists idx_driver_licenses_fleet_driver_created
  on public.driver_licenses(fleet_id, driver_user_id, created_at desc);

create index if not exists idx_driver_licenses_fleet_expires
  on public.driver_licenses(fleet_id, expires_at)
  where expires_at is not null;

create index if not exists idx_driver_licenses_expires_at
  on public.driver_licenses(expires_at)
  where expires_at is not null;

create index if not exists idx_driver_licenses_verification_status
  on public.driver_licenses(verification_status);

drop trigger if exists trg_driver_licenses_updated_at on public.driver_licenses;
create trigger trg_driver_licenses_updated_at
  before update on public.driver_licenses
  for each row execute function public.update_updated_at_column();

alter table public.driver_licenses enable row level security;

drop policy if exists driver_licenses_select_roles on public.driver_licenses;
create policy driver_licenses_select_roles on public.driver_licenses
for select to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
  or (
    public.has_role(fleet_id, 'driver'::public.role_type)
    and auth.uid() = driver_user_id
  )
);

drop policy if exists driver_licenses_insert_manager_org on public.driver_licenses;
create policy driver_licenses_insert_manager_org on public.driver_licenses
for insert to authenticated
with check (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
);

drop policy if exists driver_licenses_update_manager_org on public.driver_licenses;
create policy driver_licenses_update_manager_org on public.driver_licenses
for update to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
)
with check (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
);

drop policy if exists driver_licenses_delete_manager_org on public.driver_licenses;
create policy driver_licenses_delete_manager_org on public.driver_licenses
for delete to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
);

grant select, insert, update, delete on public.driver_licenses to authenticated;

notify pgrst, 'reload schema';
