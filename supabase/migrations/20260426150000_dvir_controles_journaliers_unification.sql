-- ============================================================================
-- Migration: 20260426150000_dvir_controles_journaliers_unification.sql
-- Objectif:
-- - Unifier les contraintes DVIR sans renommer la table canonique
-- - Ajouter les RPC de lecture/configuration attendues
-- - Renforcer la compatibilite inter-environnements (drift safe)
-- ============================================================================

-- 1) Alignement idempotent du schema canonique
alter table if exists public.controles_journaliers
  add column if not exists updated_at timestamptz not null default now();

do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'controles_journaliers'
      and con.contype = 'c'
      and con.conname in (
        'controles_journaliers_inspection_type_check',
        'controles_journaliers_overall_status_check'
      )
  loop
    execute format('alter table public.controles_journaliers drop constraint if exists %I', v_constraint_name);
  end loop;
end;
$$;

alter table public.controles_journaliers
  add constraint controles_journaliers_inspection_type_check
  check (inspection_type in ('pre_trip', 'post_trip', 'weekly', 'periodic', 'interim'));

alter table public.controles_journaliers
  add constraint controles_journaliers_overall_status_check
  check (overall_status in ('ok', 'minor_issues', 'defects_noted', 'unsafe'));

create index if not exists idx_controles_status
  on public.controles_journaliers (overall_status);

create index if not exists idx_controles_vehicle_date
  on public.controles_journaliers (vehicle_id, inspected_at desc);

-- Trigger updated_at pour harmoniser les writes
drop trigger if exists controles_journaliers_set_updated_at on public.controles_journaliers;
create trigger controles_journaliers_set_updated_at
  before update on public.controles_journaliers
  for each row execute function public.update_updated_at_column();

comment on table public.controles_journaliers is
  'DVIR canonique (pre_trip, post_trip, weekly, periodic, interim).';

comment on column public.controles_journaliers.overall_status is
  'ok | minor_issues | defects_noted | unsafe';

-- 2) RPC de lecture liste DVIR (contrat stable frontend)
create or replace function public.get_dvir_list(
  p_fleet_id uuid,
  p_vehicle_id uuid default null,
  p_inspected_by uuid default null,
  p_status text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  fleet_id uuid,
  vehicle_id uuid,
  vehicle_registration text,
  vehicle_brand text,
  vehicle_model text,
  inspected_by uuid,
  inspector_name text,
  inspection_type text,
  overall_status text,
  odometer_km integer,
  defects_count integer,
  notes text,
  inspected_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cj.id,
    cj.fleet_id,
    cj.vehicle_id,
    v.registration as vehicle_registration,
    v.brand as vehicle_brand,
    v.model as vehicle_model,
    cj.inspected_by,
    p.full_name as inspector_name,
    cj.inspection_type,
    cj.overall_status,
    cj.odometer_km,
    (
      select count(*)
      from jsonb_each(cj.items) as it(key, value)
      where lower(coalesce(it.value ->> 'status', '')) in ('defaut', 'defect')
         or it.value = 'false'::jsonb
    )::integer as defects_count,
    cj.notes,
    cj.inspected_at,
    cj.created_at
  from public.controles_journaliers cj
  join public.vehicules v on v.id = cj.vehicle_id
  left join public.profils p on p.user_id = cj.inspected_by
  where cj.fleet_id = p_fleet_id
    and (p_vehicle_id is null or cj.vehicle_id = p_vehicle_id)
    and (p_inspected_by is null or cj.inspected_by = p_inspected_by)
    and (p_status is null or cj.overall_status = p_status)
    and (p_date_from is null or cj.inspected_at::date >= p_date_from)
    and (p_date_to is null or cj.inspected_at::date <= p_date_to)
  order by cj.inspected_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.get_dvir_list(uuid, uuid, uuid, text, date, date, int, int)
  to authenticated;

-- 3) RPC configuration checklist DVIR (labels + metadata)
create or replace function public.get_dvir_checklist_config()
returns jsonb
language sql
immutable
as $$
  select jsonb_agg(item order by (item ->> 'order')::int)
  from (
    values
      (1,  'freins_service',    'Freins service',          'critical', 'Freins de service, reponse et bruits'),
      (2,  'frein_main',        'Frein a main',            'critical', 'Maintien du vehicule a l arret'),
      (3,  'direction',         'Direction',               'critical', 'Jeu, reponse et vibrations'),
      (4,  'pneus',             'Pneus et roues',          'critical', 'Usure, pression, dommages, serrage'),
      (5,  'eclairage_avant',   'Eclairage avant',         'standard', 'Phares et feux avant'),
      (6,  'eclairage_arriere', 'Eclairage arriere',       'standard', 'Feux stop, clignotants, recul'),
      (7,  'essuie_glaces',     'Essuie-glaces et retros', 'standard', 'Visibilite et retroviseurs'),
      (8,  'klaxon',            'Klaxon',                  'standard', 'Avertisseur sonore'),
      (9,  'niveaux',           'Niveaux fluides',         'standard', 'Huile, refroidissement, frein, lave-glace'),
      (10, 'carrosserie',       'Carrosserie et vitres',   'standard', 'Fissures, deformation, vitres'),
      (11, 'ceintures',         'Ceintures',               'standard', 'Presence et fonctionnement'),
      (12, 'extincteur',        'Extincteur et securite',  'standard', 'Extincteur et trousse'),
      (13, 'triangles',         'Triangles et gilet',      'standard', 'Signalisation et visibilite'),
      (14, 'documents',         'Documents a bord',        'standard', 'Carte grise, assurance, permis'),
      (15, 'proprete',          'Proprete',                'info',     'Etat interieur et exterieur')
  ) as t(order_no, slug, label, severity, description)
  cross join lateral (
    select jsonb_build_object(
      'order', t.order_no,
      'slug', t.slug,
      'label', t.label,
      'severity', t.severity,
      'description', t.description,
      'db_key', t.slug
    ) as item
  ) i;
$$;

grant execute on function public.get_dvir_checklist_config() to authenticated;
