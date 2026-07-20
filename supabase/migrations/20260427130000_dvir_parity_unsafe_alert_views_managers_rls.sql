-- Parité script 004 : alerte auto DVIR unsafe, vues analytiques, politique UPDATE gestionnaires.

-- ── 1) Idempotence alerte (évite doublons sur mises à jour successives) ──
alter table if exists public.controles_journaliers
  add column if not exists dvir_alert_created boolean not null default false;

alter table if exists public.controles_journaliers
  add column if not exists dvir_alert_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'controles_journaliers_dvir_alert_id_fkey'
  ) then
    alter table public.controles_journaliers
      add constraint controles_journaliers_dvir_alert_id_fkey
      foreign key (dvir_alert_id) references public.alertes_automatiques (id) on delete set null;
  end if;
end;
$$;

comment on column public.controles_journaliers.dvir_alert_created is
  'True si une alerte a été générée pour ce contrôle (statut unsafe).';
comment on column public.controles_journaliers.dvir_alert_id is
  'Référence alerte DVIR unsafe dans alertes_automatiques.';

-- ── 2) Trigger : création d'alerte en table réelle (pas la vue public.alerts) ──
create or replace function public.trg_controles_dvir_unsafe_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_alert_id uuid;
  v_plate    text;
  v_defauts  text[];
  v_message  text;
  v_items    jsonb;
begin
  v_items := coalesce(new.items, '{}'::jsonb);

  if new.overall_status is distinct from 'unsafe' then
    return new;
  end if;

  if coalesce(new.dvir_alert_created, false) then
    return new;
  end if;

  select v.registration
  into v_plate
  from public.vehicules v
  where v.id = new.vehicle_id;

  v_defauts := array_remove(
    array[
      case
        when lower(coalesce(v_items->'freins_service'->>'status', '')) in ('defaut', 'defect')
          or (v_items->'freins_service') = 'false'::jsonb
          then 'Freins service'
      end,
      case
        when lower(coalesce(v_items->'frein_main'->>'status', '')) in ('defaut', 'defect')
          or (v_items->'frein_main') = 'false'::jsonb
          then 'Frein à main'
      end,
      case
        when lower(coalesce(v_items->'direction'->>'status', '')) in ('defaut', 'defect')
          or (v_items->'direction') = 'false'::jsonb
          then 'Direction'
      end,
      case
        when lower(coalesce(v_items->'pneus'->>'status', '')) in ('defaut', 'defect')
          or (v_items->'pneus') = 'false'::jsonb
          then 'Pneus et roues'
      end
    ],
    null
  );

  v_message := 'DVIR UNSAFE — '
    || coalesce(v_plate, '?')
    || ' : '
    || coalesce(nullif(array_to_string(v_defauts, ', '), ''), 'défauts critiques');

  insert into public.alertes_automatiques (fleet_id, vehicle_id, alert_type, severity, message, resolved)
  values (new.fleet_id, new.vehicle_id, 'dvir_unsafe', 'critical', v_message, false)
  returning id
  into v_alert_id;

  new.dvir_alert_created := true;
  new.dvir_alert_id := v_alert_id;
  return new;
end;
$fn$;

drop trigger if exists trg_controles_dvir_unsafe_alert on public.controles_journaliers;

create trigger trg_controles_dvir_unsafe_alert
  before insert or update
  on public.controles_journaliers
  for each row
  execute function public.trg_controles_dvir_unsafe_alert();

-- ── 3) Vues analytiques (items JSONB, critères de dates alignés RPC) ──
create or replace view public.v_dvir_compliance as
select
  cj.fleet_id,
  cj.vehicle_id,
  v.registration as vehicle_registration,
  v.brand,
  v.model,
  count(*) as total_inspections,
  count(*) filter (where cj.overall_status = 'ok') as ok_count,
  count(*) filter (where cj.overall_status = 'minor_issues') as minor_count,
  count(*) filter (where cj.overall_status = 'unsafe') as unsafe_count,
  count(*) filter (where cj.overall_status = 'defects_noted') as defects_noted_count,
  round(
    count(*) filter (where cj.overall_status = 'ok')::numeric
    / nullif(count(*), 0) * 100,
    1
  ) as compliance_rate_pct,
  max(cj.inspected_at::date) as last_inspection_date,
  coalesce(
    sum(
      (
        select count(*)
        from jsonb_each(cj.items) as it (k, val)
        where lower(coalesce(val->>'status', '')) in ('defaut', 'defect')
          or val = 'false'::jsonb
      )
    ),
    0
  ) as total_defauts
from public.controles_journaliers cj
join public.vehicules v on v.id = cj.vehicle_id
where cj.inspected_at >= (current_timestamp - interval '30 days')
group by cj.fleet_id, cj.vehicle_id, v.registration, v.brand, v.model;

create or replace view public.v_dvir_defaut_frequency as
select
  cj.fleet_id,
  t.k as item_slug,
  case t.k
    when 'freins_service' then 'Freins service'
    when 'frein_main' then 'Frein à main'
    when 'direction' then 'Direction'
    when 'eclairage_avant' then 'Éclairage avant'
    when 'eclairage_arriere' then 'Éclairage arrière'
    when 'pneus' then 'Pneus et roues'
    when 'essuie_glaces' then 'Essuie-glaces'
    when 'klaxon' then 'Klaxon'
    when 'niveaux' then 'Niveaux fluides'
    when 'carrosserie' then 'Carrosserie'
    when 'ceintures' then 'Ceintures'
    when 'extincteur' then 'Extincteur'
    when 'triangles' then 'Triangles et gilet'
    when 'documents' then 'Documents à bord'
    when 'proprete' then 'Propreté'
    else t.k
  end as item_name,
  count(*) as defaut_count
from public.controles_journaliers cj
cross join lateral jsonb_each(cj.items) as t (k, val)
where cj.inspected_at >= (current_timestamp - interval '90 days')
  and (
    lower(coalesce(t.val->>'status', '')) in ('defaut', 'defect')
    or t.val = 'false'::jsonb
  )
group by cj.fleet_id, t.k
order by defaut_count desc;

grant select on public.v_dvir_compliance to authenticated, service_role;
grant select on public.v_dvir_defaut_frequency to authenticated, service_role;

-- ── 4) RLS : gestionnaire / organisateur peut mettre à jour (en plus de l'auteur 24h) ──
drop policy if exists fleet_managers_update_controles on public.controles_journaliers;

create policy fleet_managers_update_controles
  on public.controles_journaliers
  for update
  using (
    exists (
      select 1
      from public.flotte_adhesions fa
      where fa.fleet_id = controles_journaliers.fleet_id
        and fa.user_id = auth.uid()
        and fa.is_active = true
        and fa.role in ('manager', 'organizer')
    )
  )
  with check (
    exists (
      select 1
      from public.flotte_adhesions fa
      where fa.fleet_id = controles_journaliers.fleet_id
        and fa.user_id = auth.uid()
        and fa.is_active = true
        and fa.role in ('manager', 'organizer')
    )
  );
