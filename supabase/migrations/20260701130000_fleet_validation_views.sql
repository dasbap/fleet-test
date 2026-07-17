-- Fleet validation dashboard views expected by the React runtime.
-- Restores the REST contract used by useFleetValidation:
--   - public.v_kpis_flotte
--   - public.v_creneaux_actifs_validations

alter table public.clotures_creneaux
  add column if not exists expected_revenue int,
  add column if not exists revenue_gap int;

CREATE TABLE IF NOT EXISTS public.journal_carburant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL REFERENCES public.profils(user_id) ON DELETE RESTRICT,
  liters numeric(10, 3) NOT NULL CHECK (liters > 0),
  amount_xof integer NOT NULL CHECK (amount_xof >= 0),
  odometer_km integer NOT NULL CHECK (odometer_km >= 0),
  purchased_at timestamptz NOT NULL,
  station_name text NULL,
  receipt_ref text NULL,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_carburant_idempotency_key
  ON public.journal_carburant(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_journal_carburant_vehicle_created_at
  ON public.journal_carburant(vehicle_id, created_at DESC);

ALTER TABLE public.journal_carburant ENABLE ROW LEVEL SECURITY;

drop view if exists public.v_kpis_flotte;
create or replace view public.v_kpis_flotte
with (security_barrier = true)
as
select
  f.id as fleet_id,
  coalesce(shift_stats.creneaux_ouverts, 0)::int as creneaux_ouverts,
  coalesce(shift_stats.creneaux_fermes, 0)::int as creneaux_fermes,
  coalesce(closure_stats.revenus_valides_xaf, 0)::int as revenus_valides_xaf,
  coalesce(closure_stats.revenus_en_attente_xaf, 0)::int as revenus_en_attente_xaf,
  coalesce(closure_stats.revenus_rejetes_xaf, 0)::int as revenus_rejetes_xaf,
  coalesce(closure_stats.ecart_total_xaf, 0)::int as ecart_total_xaf,
  coalesce(closure_stats.clotures_pending, 0)::int as clotures_pending,
  coalesce(closure_stats.clotures_rejetees, 0)::int as clotures_rejetees,
  coalesce(closure_stats.clotures_sans_preuve, 0)::int as clotures_sans_preuve,
  coalesce(vehicle_stats.vehicules_actifs, 0)::int as vehicules_actifs
from public.flottes f
left join lateral (
  select
    count(*) filter (where c.status = 'open')::int as creneaux_ouverts,
    count(*) filter (where c.status = 'closed')::int as creneaux_fermes
  from public.creneaux_conducteurs c
  join public.affectations_vehicules av on av.id = c.assignment_id
  where av.fleet_id = f.id
) shift_stats on true
left join lateral (
  select
    coalesce(sum(cl.revenue_declared) filter (where cl.status = 'validated'), 0)::int as revenus_valides_xaf,
    coalesce(sum(cl.revenue_declared) filter (where cl.status = 'pending'), 0)::int as revenus_en_attente_xaf,
    coalesce(sum(cl.revenue_declared) filter (where cl.status = 'rejected'), 0)::int as revenus_rejetes_xaf,
    coalesce(sum(cl.revenue_gap), 0)::int as ecart_total_xaf,
    count(*) filter (where cl.status = 'pending')::int as clotures_pending,
    count(*) filter (where cl.status = 'rejected')::int as clotures_rejetees,
    count(*) filter (
      where cl.proof_value is null or btrim(cl.proof_value) = ''
    )::int as clotures_sans_preuve
  from public.clotures_creneaux cl
  join public.creneaux_conducteurs c on c.id = cl.shift_id
  join public.affectations_vehicules av on av.id = c.assignment_id
  where av.fleet_id = f.id
) closure_stats on true
left join lateral (
  select count(*) filter (where v.status = 'ok')::int as vehicules_actifs
  from public.vehicules v
  where v.fleet_id = f.id
) vehicle_stats on true
where
  coalesce(auth.role(), '') = 'service_role'
  or exists (
    select 1
    from public.flotte_adhesions fa
    where fa.fleet_id = f.id
      and fa.user_id = auth.uid()
      and fa.is_active = true
      and fa.role::text in ('organizer', 'manager', 'mechanic')
  );

drop view if exists public.v_creneaux_actifs_validations;
create or replace view public.v_creneaux_actifs_validations
with (security_barrier = true)
as
select
  c.id as creneau_id,
  av.fleet_id,
  v.registration,
  v.brand,
  v.model,
  c.status as statut_creneau,
  c.started_at,
  c.km_start,
  coalesce(c.km_end, v.current_km, c.km_start) as current_km,
  coalesce(dvir_pre.dvir_pre_count, 0)::int as dvir_pre_count,
  dvir_pre.dvir_pre_statut,
  coalesce(dvir_post.dvir_post_count, 0)::int as dvir_post_count,
  dvir_post.dvir_post_statut,
  coalesce(fuel.carburant_saisies, 0)::int as carburant_saisies,
  coalesce(fuel.carburant_litres_total, 0)::numeric as carburant_litres_total,
  coalesce(fuel.carburant_xof_total, 0)::int as carburant_xof_total,
  cl.id as cloture_id,
  cl.status as cloture_statut,
  cl.revenue_declared as cloture_revenue_declared,
  cl.expected_revenue as cloture_expected_revenue,
  cl.revenue_gap as cloture_revenue_gap,
  cl.collection_mode as cloture_collection_mode,
  cl.proof_type as preuve_type,
  cl.proof_value as preuve_valeur,
  case
    when cl.proof_value is null or btrim(cl.proof_value) = '' then 'inconnu'
    when cl.proof_value like 'data:%' then 'base64'
    when cl.proof_type in ('momo_ref', 'reference', 'ref') then 'reference'
    when cl.proof_type in ('photo', 'doc', 'storage') then 'storage'
    else 'reference'
  end as preuve_mode_rendu
from public.creneaux_conducteurs c
join public.affectations_vehicules av on av.id = c.assignment_id
join public.vehicules v on v.id = av.vehicle_id
left join public.clotures_creneaux cl on cl.shift_id = c.id
left join lateral (
  select
    count(*)::int as dvir_pre_count,
    (array_agg(cj.overall_status order by cj.inspected_at desc))[1] as dvir_pre_statut
  from public.controles_journaliers cj
  where cj.fleet_id = av.fleet_id
    and cj.vehicle_id = av.vehicle_id
    and cj.inspected_by = av.driver_user_id
    and cj.inspection_type = 'pre_trip'
    and cj.inspected_at >= date_trunc('day', c.started_at)
    and cj.inspected_at < date_trunc('day', c.started_at) + interval '1 day'
) dvir_pre on true
left join lateral (
  select
    count(*)::int as dvir_post_count,
    (array_agg(cj.overall_status order by cj.inspected_at desc))[1] as dvir_post_statut
  from public.controles_journaliers cj
  where cj.fleet_id = av.fleet_id
    and cj.vehicle_id = av.vehicle_id
    and cj.inspected_by = av.driver_user_id
    and cj.inspection_type = 'post_trip'
    and cj.inspected_at >= date_trunc('day', c.started_at)
    and cj.inspected_at < date_trunc('day', c.started_at) + interval '1 day'
) dvir_post on true
left join lateral (
  select
    count(*)::int as carburant_saisies,
    coalesce(sum(j.liters), 0)::numeric as carburant_litres_total,
    coalesce(sum(j.amount_xof), 0)::int as carburant_xof_total
  from public.journal_carburant j
  where j.fleet_id = av.fleet_id
    and j.vehicle_id = av.vehicle_id
    and j.driver_user_id = av.driver_user_id
    and j.purchased_at >= c.started_at
    and j.purchased_at <= coalesce(c.ended_at, now())
) fuel on true
where
  (
    c.status = 'open'
    or cl.status in ('pending', 'rejected')
  )
  and (
    coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1
      from public.flotte_adhesions fa
      where fa.fleet_id = av.fleet_id
        and fa.user_id = auth.uid()
        and fa.is_active = true
        and (
          fa.role::text in ('organizer', 'manager', 'mechanic')
          or av.driver_user_id = auth.uid()
        )
    )
  );

grant select on public.v_kpis_flotte to authenticated, service_role;
grant select on public.v_creneaux_actifs_validations to authenticated, service_role;

comment on view public.v_kpis_flotte is
  'Fleet validation KPI aggregate used by the dashboard validation strip.';

comment on view public.v_creneaux_actifs_validations is
  'Open shifts and pending/rejected closures enriched with DVIR, fuel, proof, and closure validation data.';

notify pgrst, 'reload schema';
