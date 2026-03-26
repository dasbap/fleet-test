-- =====================================================
-- E-SAMBA DATABASE SCHEMA v2
-- Execute this SQL in your Supabase SQL Editor
-- =====================================================

-- EXT
create extension if not exists pgcrypto;

-- ENUMS (création idempotente)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'role_type') then
    create type role_type as enum ('organizer','manager','driver','mechanic');
  end if;
exception
  when duplicate_object then
    -- already exists, do nothing
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'vehicle_status') then
    create type vehicle_status as enum ('ok','blocked');
  end if;
exception
  when duplicate_object then
    -- already exists, do nothing
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'closure_status') then
    create type closure_status as enum ('pending','validated','rejected');
  end if;
exception
  when duplicate_object then
    -- already exists, do nothing
end;
$$;

-- TENANCY
create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null default 'CM',
  created_at timestamptz not null default now()
);

create table flottes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  collection_policy text not null default 'mix', -- cash|momo|mix
  created_at timestamptz not null default now()
);

create table profils (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table flotte_adhesions (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references flottes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role role_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (fleet_id, user_id, role)
);

-- INVITATIONS
create table flotte_invitations (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references flottes(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz,
  max_uses int,
  current_uses int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- VEHICLES
create table vehicules (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references flottes(id) on delete cascade,
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
create table affectations_vehicules (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references flottes(id) on delete cascade,
  vehicle_id uuid not null references vehicules(id) on delete cascade,
  driver_user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index une_affectation_active_par_conducteur
on affectations_vehicules(driver_user_id)
where is_active = true;

create unique index une_affectation_active_par_vehicule
on affectations_vehicules(vehicle_id)
where is_active = true;

-- SHIFTS & CLOSURES
create table creneaux_conducteurs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references affectations_vehicules(id) on delete restrict,
  km_start int not null,
  km_end int,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'open' -- open|closed
);

create table clotures_creneaux (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references creneaux_conducteurs(id) on delete cascade,
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
  vehicle_id uuid not null references vehicules(id) on delete cascade,
  driver_user_id uuid not null references auth.users(id),
  severity text not null default 'medium',
  description text not null,
  evidence_path text,
  created_at timestamptz not null default now()
);

create table travaux_maintenance (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicules(id) on delete cascade,
  fleet_id uuid not null references flottes(id) on delete cascade,
  created_from_incident_id uuid references incidents(id),
  priority text not null default 'medium',
  status text not null default 'queued', -- queued|in_progress|ready|blocked
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table preuves_maintenance (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references travaux_maintenance(id) on delete cascade,
  kind text not null, -- before|after
  file_path text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table listes_verification_maintenance (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references travaux_maintenance(id) on delete cascade,
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

create table paiements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
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

create table abonnements (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references flottes(id) on delete cascade,
  plan_id uuid not null references plans(id),
  payment_id uuid references paiements(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active'
);

create table droits_vehicules (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicules(id) on delete cascade,
  subscription_id uuid not null references abonnements(id) on delete cascade,
  active boolean not null default true,
  unique(vehicle_id, subscription_id)
);

create table jetons_qr (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicules(id) on delete cascade,
  token_hash text not null unique,
  scope text not null default 'subscription', -- subscription|debug
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

create or replace function has_role(p_flotte_id uuid, p_role role_type)
returns boolean language sql stable as $$
  select exists (
    select 1 from flotte_adhesions
    where fleet_id = p_flotte_id
      and user_id = auth.uid()
      and role = p_role
      and is_active = true
  );
$$;

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- RPC: affecter vehicule (atomic) + checks
create or replace function affecter_vehicule(
  p_flotte_id uuid,
  p_vehicule_id uuid,
  p_conducteur_utilisateur_id uuid,
  p_debute_a timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicule vehicules%ROWTYPE;
  v_affectation_id uuid;
begin
  select * into v_vehicule
  from vehicules
  where id = p_vehicule_id and fleet_id = p_flotte_id
  for update;

  if not found then raise exception 'vehicule_non_trouve'; end if;
  if v_vehicule.status = 'blocked' then raise exception 'vehicule_bloque'; end if;

  -- "pas de clôture -> pas de nouvelle affectation" pour ce véhicule
  if exists (
    select 1
    from affectations_vehicules a
    join creneaux_conducteurs c on c.assignment_id = a.id
    left join clotures_creneaux cl on cl.shift_id = c.id
    where a.vehicle_id = p_vehicule_id
      and a.is_active = false
      and c.status = 'closed'
      and cl.id is null
      and c.ended_at > now() - interval '7 days'
  ) then
    raise exception 'cloture_manquante_bloque_affectation';
  end if;

  if exists (select 1 from affectations_vehicules where driver_user_id = p_conducteur_utilisateur_id and is_active = true)
  then raise exception 'conducteur_deja_affecte'; end if;

  insert into affectations_vehicules(fleet_id, vehicle_id, driver_user_id, starts_at, created_by)
  values (p_flotte_id, p_vehicule_id, p_conducteur_utilisateur_id, p_debute_a, auth.uid())
  returning id into v_affectation_id;

  return v_affectation_id;
end;
$$;

-- RPC: fermer creneau
create or replace function fermer_creneau(
  p_creneau_id uuid,
  p_km_fin int,
  p_revenu_declare int,
  p_mode_collecte text,
  p_type_preuve text,
  p_valeur_preuve text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update creneaux_conducteurs
    set km_end = p_km_fin, ended_at = now(), status = 'closed'
  where id = p_creneau_id;

  insert into clotures_creneaux(shift_id, revenue_declared, collection_mode, proof_type, proof_value)
  values (p_creneau_id, p_revenu_declare, p_mode_collecte, p_type_preuve, p_valeur_preuve)
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

alter table flotte_adhesions enable row level security;
alter table vehicules enable row level security;
alter table affectations_vehicules enable row level security;
alter table creneaux_conducteurs enable row level security;
alter table clotures_creneaux enable row level security;
alter table incidents enable row level security;
alter table travaux_maintenance enable row level security;
alter table preuves_maintenance enable row level security;
alter table listes_verification_maintenance enable row level security;
alter table abonnements enable row level security;
alter table droits_vehicules enable row level security;
alter table jetons_qr enable row level security;
alter table flotte_invitations enable row level security;
alter table organisations enable row level security;
alter table flottes enable row level security;
alter table plans enable row level security;

-- Politiques restrictives organisations / flottes / flotte_adhesions / preuves_maintenance :
-- voir migrations 20250223100000, 20250223110000 et 20260326130000 pour la source de vérité.

-- ORGANISATIONS
create policy orgs_select_member on organisations
  for select to authenticated
  using (
    exists (
      select 1 from flottes f
      join flotte_adhesions fa on fa.fleet_id = f.id
      where f.org_id = organisations.id and fa.user_id = auth.uid() and fa.is_active = true
    )
  );
create policy orgs_update_member on organisations
  for update to authenticated
  using (
    exists (
      select 1 from flottes f
      join flotte_adhesions fa on fa.fleet_id = f.id
      where f.org_id = organisations.id and fa.user_id = auth.uid() and fa.is_active = true
        and fa.role in ('manager', 'organizer')
    )
  )
  with check (
    exists (
      select 1 from flottes f
      join flotte_adhesions fa on fa.fleet_id = f.id
      where f.org_id = organisations.id and fa.user_id = auth.uid() and fa.is_active = true
        and fa.role in ('manager', 'organizer')
    )
  );
create policy orgs_insert_authenticated on organisations
  for insert to authenticated
  with check (
    auth.uid() is not null
    and name is not null
    and length(trim(name)) > 0
    and country_code is not null
    and length(trim(country_code)) > 0
  );
create policy orgs_delete_manager_org on organisations
  for delete to authenticated
  using (
    exists (
      select 1 from flottes f
      join flotte_adhesions fa on fa.fleet_id = f.id
      where f.org_id = organisations.id and fa.user_id = auth.uid() and fa.is_active = true
        and fa.role in ('manager', 'organizer')
    )
  );

-- FLOTTES
create policy flottes_select_manager_org on flottes
  for select to authenticated using (has_role(id, 'manager') or has_role(id, 'organizer'));
create policy flottes_insert_manager_org_org on flottes
  for insert to authenticated
  with check (
    exists (
      select 1 from flotte_adhesions fa
      join flottes f on f.id = fa.fleet_id
      where f.org_id = flottes.org_id and fa.user_id = auth.uid() and fa.is_active = true
        and fa.role in ('manager', 'organizer')
    )
    or not exists (select 1 from flottes f2 where f2.org_id = flottes.org_id)
  );
create policy flottes_update_manager_org on flottes
  for update to authenticated
  using (has_role(id, 'manager') or has_role(id, 'organizer'))
  with check (has_role(id, 'manager') or has_role(id, 'organizer'));
create policy flottes_delete_manager_org on flottes
  for delete to authenticated using (has_role(id, 'manager') or has_role(id, 'organizer'));

-- FLOTTE INVITATIONS policies (allow public read for validation during signup)
create policy invitations_lecture_publique on flotte_invitations
for select to anon, authenticated using (true);

create policy invitations_ecriture_manager_org on flotte_invitations
for insert with check (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy invitations_modification_manager_org on flotte_invitations
for update using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

-- VEHICULES policies
create policy vehicules_lecture_manager_org on vehicules
for select using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy vehicules_ecriture_manager_org on vehicules
for insert with check (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy vehicules_modification_manager_org on vehicules
for update using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy vehicules_lecture_conducteur_affecte on vehicules
for select using (
  exists (
    select 1 from affectations_vehicules a
    where a.vehicle_id = vehicules.id
      and a.driver_user_id = auth.uid()
      and a.is_active = true
  )
);

-- AFFECTATIONS policies
create policy affectations_creation_manager_org on affectations_vehicules
for insert with check (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy affectations_lecture_manager_org on affectations_vehicules
for select using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer'));

create policy affectations_lecture_conducteur_soi on affectations_vehicules
for select using (driver_user_id = auth.uid());

-- CRENEAUX policies
create policy creneaux_lecture_conducteur on creneaux_conducteurs
for select using (
  exists (
    select 1 from affectations_vehicules a
    where a.id = creneaux_conducteurs.assignment_id
      and a.driver_user_id = auth.uid()
  )
);

create policy creneaux_insertion_conducteur on creneaux_conducteurs
for insert with check (
  exists (
    select 1 from affectations_vehicules a
    where a.id = creneaux_conducteurs.assignment_id
      and a.driver_user_id = auth.uid()
      and a.is_active = true
  )
);

create policy creneaux_lecture_manager_org on creneaux_conducteurs
for select using (
  exists (
    select 1 from affectations_vehicules a
    where a.id = creneaux_conducteurs.assignment_id
      and (has_role(a.fleet_id,'manager') or has_role(a.fleet_id,'organizer'))
  )
);

-- CLOTURES policies
create policy clotures_insertion_conducteur on clotures_creneaux
for insert with check (
  exists (
    select 1
    from creneaux_conducteurs c
    join affectations_vehicules a on a.id = c.assignment_id
    where c.id = clotures_creneaux.shift_id
      and a.driver_user_id = auth.uid()
  )
);

create policy clotures_modification_manager on clotures_creneaux
for update using (
  exists (
    select 1
    from creneaux_conducteurs c
    join affectations_vehicules a on a.id = c.assignment_id
    where c.id = clotures_creneaux.shift_id
      and (has_role(a.fleet_id,'manager') or has_role(a.fleet_id,'organizer'))
  )
);

-- INCIDENTS policies
create policy incidents_lecture_flotte on incidents
for select using (
  exists (
    select 1 from vehicules v
    where v.id = incidents.vehicle_id
      and (has_role(v.fleet_id,'manager') or has_role(v.fleet_id,'organizer') or has_role(v.fleet_id,'mechanic'))
  )
);

create policy incidents_insertion_conducteur on incidents
for insert with check (driver_user_id = auth.uid());

create policy incidents_lecture_conducteur on incidents
for select using (driver_user_id = auth.uid());

-- MAINTENANCE: mechanic+manager+org read; mechanic writes evidence/checklist
create policy travaux_lecture_mgr_org_mec on travaux_maintenance
for select using (has_role(fleet_id,'manager') or has_role(fleet_id,'organizer') or has_role(fleet_id,'mechanic'));

create policy preuves_insertion_mec on preuves_maintenance
for insert to authenticated
with check (
  exists (
    select 1 from travaux_maintenance t
    where t.id = job_id and has_role(t.fleet_id, 'mechanic')
  )
);

-- FLOTTE ADHESIONS policies (lecture / écriture restrictive)
create policy memberships_select_self_or_manager_org on flotte_adhesions
for select to authenticated
using (user_id = auth.uid() or has_role(fleet_id, 'manager') or has_role(fleet_id, 'organizer'));
create policy memberships_insert_manager_org on flotte_adhesions
for insert to authenticated with check (has_role(fleet_id, 'manager') or has_role(fleet_id, 'organizer'));
create policy memberships_update_manager_org on flotte_adhesions
for update to authenticated
using (has_role(fleet_id, 'manager') or has_role(fleet_id, 'organizer'))
with check (has_role(fleet_id, 'manager') or has_role(fleet_id, 'organizer'));
create policy memberships_delete_manager_org on flotte_adhesions
for delete to authenticated using (has_role(fleet_id, 'manager') or has_role(fleet_id, 'organizer'));

-- PLANS (catalogue lecture seule)
create policy plans_select_authenticated on plans
for select to authenticated using (true);

-- =====================================================
-- TRIGGERS FOR AUTO-PROFILE CREATION
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  -- Essayer d'obtenir le full_name depuis les métadonnées
  v_full_name := new.raw_user_meta_data->>'full_name';
  
  -- Si full_name n'est pas disponible, utiliser la partie avant @ de l'email
  if v_full_name is null or v_full_name = '' then
    v_full_name := split_part(new.email, '@', 1);
  end if;
  
  -- Créer le profil avec le full_name déterminé
  insert into public.profils (user_id, full_name)
  values (new.id, v_full_name)
  on conflict (user_id) do update
  set full_name = coalesce(profils.full_name, excluded.full_name);
  
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
    insert into public.flotte_adhesions (fleet_id, user_id, role, is_active)
    values (v_fleet_id, new.id, 'driver', true);
    
    -- Increment invitation usage counter
    if v_invitation_code is not null then
      update public.flotte_invitations 
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

create index idx_vehicules_fleet_id on vehicules(fleet_id);
create index idx_vehicules_status on vehicules(status);
create index idx_incidents_vehicle_id on incidents(vehicle_id);
create index idx_creneaux_conducteurs_assignment_id on creneaux_conducteurs(assignment_id);
create index idx_flotte_adhesions_user_id on flotte_adhesions(user_id);
create index idx_flotte_adhesions_fleet_id on flotte_adhesions(fleet_id);
create index idx_travaux_maintenance_fleet_id on travaux_maintenance(fleet_id);
create index idx_travaux_maintenance_vehicle_id on travaux_maintenance(vehicle_id);
