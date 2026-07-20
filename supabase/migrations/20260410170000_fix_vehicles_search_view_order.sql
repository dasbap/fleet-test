-- Migration corrective: garantir une définition stable de la vue de recherche
-- puis appliquer les permissions dans un ordre sûr.

drop view if exists public.vehicles_search_view cascade;

create view public.vehicles_search_view as
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

revoke all on table public.vehicles_search_view from authenticated;
revoke all on table public.vehicles_search_view from anon;
