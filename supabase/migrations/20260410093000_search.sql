-- Recherche multi-critères véhicules (schéma actuel en français)
-- Moteur principal: ILIKE + index trigram (pg_trgm)

create extension if not exists pg_trgm;

-- Index trigram sur les champs textuels les plus consultés côté véhicule
do $$
begin
  if to_regclass('public.idx_vehicules_search_trgm') is null then
    execute $sql$
      create index idx_vehicules_search_trgm
        on public.vehicules
        using gin (
          (coalesce(registration, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(model, '')) gin_trgm_ops
        )
    $sql$;
  end if;
end $$;

-- Index trigram sur nom conducteur (table profils)
do $$
begin
  if to_regclass('public.idx_profils_full_name_trgm') is null then
    execute $sql$
      create index idx_profils_full_name_trgm
        on public.profils
        using gin ((coalesce(full_name, '')) gin_trgm_ops)
    $sql$;
  end if;
end $$;

-- Index de filtre exact sur statut véhicule
create index if not exists idx_vehicules_fleet_status
  on public.vehicules (fleet_id, status);

-- Index de filtre exact pour interventions en attente/actives
create index if not exists idx_travaux_maintenance_pending
  on public.travaux_maintenance (vehicle_id, status, priority, planned_at)
  where status in ('queued', 'in_progress', 'blocked');

-- Index de filtre exact pour alertes actives par véhicule
create index if not exists idx_alertes_automatiques_active_vehicle
  on public.alertes_automatiques (vehicle_id, resolved, severity, created_at)
  where resolved = false;

-- Vue de recherche enrichie
create or replace view public.vehicles_search_view as
select
  v.id,
  v.fleet_id,
  v.registration as plate,
  v.brand,
  v.model,
  v.current_km as km,
  case
    when exists (
      select 1
      from public.travaux_maintenance tm
      where tm.vehicle_id = v.id
        and tm.status in ('queued', 'in_progress', 'blocked')
    ) then 'maintenance'
    when v.status = 'ok' then 'active'
    else 'idle'
  end as status,
  drv.full_name as driver_name,
  (
    select tm.status
    from public.travaux_maintenance tm
    where tm.vehicle_id = v.id
      and tm.status in ('queued', 'in_progress', 'blocked')
    order by
      case tm.status
        when 'in_progress' then 1
        when 'blocked' then 2
        else 3
      end,
      tm.created_at asc
    limit 1
  ) as pending_maint_type,
  (
    select aa.severity
    from public.alertes_automatiques aa
    where aa.vehicle_id = v.id
      and aa.resolved = false
    order by
      case aa.severity
        when 'critical' then 1
        when 'high' then 2
        when 'medium' then 3
        else 4
      end,
      aa.created_at desc
    limit 1
  ) as alert_severity,
  case (
    select aa.severity
    from public.alertes_automatiques aa
    where aa.vehicle_id = v.id
      and aa.resolved = false
    order by
      case aa.severity
        when 'critical' then 1
        when 'high' then 2
        when 'medium' then 3
        else 4
      end,
      aa.created_at desc
    limit 1
  )
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    else 4
  end as alert_rank,
  (
    coalesce(v.registration, '') || ' ' ||
    coalesce(v.brand, '') || ' ' ||
    coalesce(v.model, '') || ' ' ||
    coalesce(drv.full_name, '')
  ) as search_text
from public.vehicules v
left join lateral (
  select a.driver_user_id
  from public.affectations_vehicules a
  where a.vehicle_id = v.id
    and a.is_active = true
  order by a.starts_at desc
  limit 1
) active_assignment on true
left join public.profils drv
  on drv.user_id = active_assignment.driver_user_id;
