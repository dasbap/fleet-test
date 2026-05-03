-- Baseline fantôme : stubs minimaux pour permettre la validation des corps de fonctions SQL
-- Ces tables sont créées par les migrations legacy ; ce fichier garantit leur existence
-- dans le contexte de rejeu depuis ce point de départ (CI ghost-folder).

create table if not exists public.flottes (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  created_at timestamptz default now()
);

create table if not exists public.flotte_adhesions (
  id         uuid primary key default gen_random_uuid(),
  fleet_id   uuid references public.flottes(id) on delete cascade,
  user_id    uuid,
  role       text,
  is_active  boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.profils (
  user_id    uuid primary key,
  full_name  text,
  phone      text,
  created_at timestamptz default now()
);

create table if not exists public.vehicules (
  id           uuid primary key default gen_random_uuid(),
  fleet_id     uuid references public.flottes(id) on delete cascade,
  registration text,
  brand        text,
  model        text,
  status       text default 'ok',
  current_km   int  default 0,
  created_at   timestamptz default now()
);

create table if not exists public.affectations_vehicules (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     uuid references public.vehicules(id) on delete cascade,
  driver_user_id uuid,
  is_active      boolean not null default true,
  starts_at      timestamptz default now(),
  created_at     timestamptz default now()
);

create table if not exists public.travaux_maintenance (
  id         uuid primary key default gen_random_uuid(),
  fleet_id   uuid references public.flottes(id) on delete cascade,
  vehicle_id uuid references public.vehicules(id) on delete cascade,
  status     text,
  priority   text,
  notes      text,
  planned_at timestamptz,
  closed_at  timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.alertes_automatiques (
  id         uuid primary key default gen_random_uuid(),
  fleet_id   uuid references public.flottes(id) on delete cascade,
  vehicle_id uuid references public.vehicules(id) on delete cascade,
  message    text,
  severity   text,
  resolved   boolean not null default false,
  created_at timestamptz default now()
);
