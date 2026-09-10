create table if not exists public.driver_legal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date not null,
  birth_place text not null,
  nationality_country text not null check (char_length(nationality_country) = 2),
  residence_country text not null check (char_length(residence_country) = 2),
  address text not null,
  identity_document_type text not null check (identity_document_type in ('national_id', 'passport', 'residence_permit')),
  identity_document_number text not null,
  identity_issued_at date not null,
  identity_expires_at date,
  identity_document_path text not null,
  driving_license_number text not null,
  driving_license_categories text[] not null default '{}',
  driving_license_issued_at date not null,
  driving_license_expires_at date not null,
  driving_license_country text not null check (char_length(driving_license_country) = 2),
  driving_license_document_path text not null,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (driving_license_expires_at >= driving_license_issued_at),
  check (identity_expires_at is null or identity_expires_at >= identity_issued_at)
);

create table if not exists public.vehicle_legal_documents (
  vehicle_id uuid primary key references public.vehicules(id) on delete cascade,
  country_code text not null check (char_length(country_code) = 2),
  registration_certificate_number text not null,
  registration_certificate_path text not null,
  insurer_name text not null,
  insurance_policy_number text not null,
  insurance_issued_at date not null,
  insurance_expires_at date not null,
  insurance_document_path text not null,
  technical_inspection_number text not null,
  technical_inspection_issued_at date not null,
  technical_inspection_expires_at date not null,
  technical_inspection_document_path text not null,
  road_tax_reference text,
  road_tax_expires_at date,
  road_tax_document_path text,
  transport_license_number text,
  transport_license_expires_at date,
  transport_license_document_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (insurance_expires_at >= insurance_issued_at),
  check (technical_inspection_expires_at >= technical_inspection_issued_at)
);

alter table public.driver_legal_profiles enable row level security;
alter table public.vehicle_legal_documents enable row level security;

create policy driver_legal_profiles_select on public.driver_legal_profiles for select to authenticated using (
  user_id = auth.uid() or public.is_platform_admin() or exists (
    select 1 from public.flotte_adhesions target
    where target.user_id = driver_legal_profiles.user_id
      and target.is_active = true
      and public.rbac_is_fleet_manager_or_above(target.fleet_id)
  )
);
create policy driver_legal_profiles_insert_own on public.driver_legal_profiles for insert to authenticated with check (user_id = auth.uid());
create policy driver_legal_profiles_update_own on public.driver_legal_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy vehicle_legal_documents_select on public.vehicle_legal_documents for select to authenticated using (
  public.is_platform_admin() or exists (
    select 1 from public.vehicules v join public.flotte_adhesions fa on fa.fleet_id = v.fleet_id
    where v.id = vehicle_legal_documents.vehicle_id and fa.user_id = auth.uid() and fa.is_active = true
  )
);
create policy vehicle_legal_documents_write on public.vehicle_legal_documents for all to authenticated using (
  public.is_platform_admin() or exists (
    select 1 from public.vehicules v where v.id = vehicle_legal_documents.vehicle_id and public.rbac_is_fleet_manager_or_above(v.fleet_id)
  )
) with check (
  public.is_platform_admin() or exists (
    select 1 from public.vehicules v where v.id = vehicle_legal_documents.vehicle_id and public.rbac_is_fleet_manager_or_above(v.fleet_id)
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('legal-documents', 'legal-documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy legal_documents_read on storage.objects for select to authenticated using (
  bucket_id = 'legal-documents' and (
    ((storage.foldername(name))[1] = 'drivers' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_platform_admin() or exists (
      select 1 from public.flotte_adhesions target where target.user_id::text = (storage.foldername(name))[2] and target.is_active = true and public.rbac_is_fleet_manager_or_above(target.fleet_id)
    )))
    or ((storage.foldername(name))[1] = 'vehicles' and (public.is_platform_admin() or exists (
      select 1 from public.flotte_adhesions fa where fa.user_id = auth.uid() and fa.fleet_id::text = (storage.foldername(name))[2] and fa.is_active = true
    )))
  )
);

create policy legal_documents_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'legal-documents' and (
    ((storage.foldername(name))[1] = 'drivers' and (storage.foldername(name))[2] = auth.uid()::text)
    or ((storage.foldername(name))[1] = 'vehicles' and exists (
      select 1 from public.flotte_adhesions fa where fa.user_id = auth.uid() and fa.fleet_id::text = (storage.foldername(name))[2] and fa.is_active = true and fa.role::text in ('organizer','manager')
    ))
    or public.is_platform_admin()
  )
);

create or replace function public.is_driver_legally_compliant(p_driver_user_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.driver_legal_profiles d
    where d.user_id = p_driver_user_id
      and nullif(trim(d.identity_document_number), '') is not null
      and nullif(trim(d.identity_document_path), '') is not null
      and (d.identity_expires_at is null or d.identity_expires_at >= current_date)
      and nullif(trim(d.driving_license_number), '') is not null
      and coalesce(array_length(d.driving_license_categories, 1), 0) > 0
      and d.driving_license_expires_at >= current_date
      and nullif(trim(d.driving_license_document_path), '') is not null
  );
$$;

create or replace function public.is_vehicle_legally_compliant(p_vehicle_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vehicle_legal_documents d
    where d.vehicle_id = p_vehicle_id
      and nullif(trim(d.registration_certificate_number), '') is not null
      and nullif(trim(d.registration_certificate_path), '') is not null
      and nullif(trim(d.insurance_policy_number), '') is not null
      and d.insurance_expires_at >= current_date
      and nullif(trim(d.insurance_document_path), '') is not null
      and nullif(trim(d.technical_inspection_number), '') is not null
      and d.technical_inspection_expires_at >= current_date
      and nullif(trim(d.technical_inspection_document_path), '') is not null
  );
$$;

grant execute on function public.is_driver_legally_compliant(uuid) to authenticated;
grant execute on function public.is_vehicle_legally_compliant(uuid) to authenticated;
