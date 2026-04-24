-- Migration: Transit CEMAC — journalisation des passages frontières Zone CEMAC
-- Créé le 2026-04-24

-- ── Table principale ────────────────────────────────────────────────────────
create table if not exists public.transits_cemac (
  id               uuid primary key default gen_random_uuid(),
  fleet_id         uuid not null references public.fleets(id) on delete cascade,
  vehicle_id       uuid not null references public.vehicules(id) on delete cascade,
  driver_id        uuid references public.profils(id) on delete set null,

  -- Corridor CEMAC
  departure_country text not null,                 -- Ex: "CM" (Cameroun)
  arrival_country   text not null,                 -- Ex: "TD" (Tchad)
  border_post       text,                          -- Ex: "Kousséri / N'Djamena"
  corridor          text,                          -- Ex: "Douala–N'Djamena"

  -- Documents douaniers
  permit_ref        text,                          -- N° TRIE / carnet de passage
  document_type     text not null default 'trie',  -- 'trie' | 'carnet_passage' | 'manifeste' | 'autre'

  -- Dates
  departure_date    date not null,
  arrival_date      date,                          -- null = en transit

  -- Statut
  status            text not null default 'en_route'
                      check (status in ('en_route', 'arrive', 'retour', 'incident', 'annule')),

  -- Détails complémentaires
  cargo_description text,
  cargo_weight_kg   numeric,
  notes             text,

  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Index ────────────────────────────────────────────────────────────────────
create index if not exists transits_cemac_fleet_id_idx       on public.transits_cemac (fleet_id);
create index if not exists transits_cemac_vehicle_id_idx     on public.transits_cemac (vehicle_id);
create index if not exists transits_cemac_departure_date_idx on public.transits_cemac (departure_date desc);
create index if not exists transits_cemac_status_idx         on public.transits_cemac (status);

-- ── Trigger updated_at ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transits_cemac_updated_at
  before update on public.transits_cemac
  for each row execute procedure public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.transits_cemac enable row level security;

-- Les membres de la flotte peuvent lire les transits de leur flotte
create policy "fleet_members_read_transits"
  on public.transits_cemac
  for select
  using (
    fleet_id in (
      select fleet_id from public.membres_flotte
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Les membres actifs peuvent créer des transits pour leur flotte
create policy "fleet_members_create_transits"
  on public.transits_cemac
  for insert
  with check (
    fleet_id in (
      select fleet_id from public.membres_flotte
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Les membres actifs peuvent mettre à jour les transits de leur flotte
create policy "fleet_members_update_transits"
  on public.transits_cemac
  for update
  using (
    fleet_id in (
      select fleet_id from public.membres_flotte
      where user_id = auth.uid() and status = 'active'
    )
  );
