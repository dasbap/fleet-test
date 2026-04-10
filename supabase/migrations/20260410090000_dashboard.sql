-- Vue matérialisée : alerte enrichie avec infos véhicule + action métier calculée
create or replace view public.dashboard_alerts as
select
  a.id,
  a.org_id,
  a.vehicle_id                                    as "vehicleId",
  v.plate,
  v.brand || ' ' || v.model                       as "vehicleName",
  a.severity,
  a.type,
  a.message,
  a.created_at                                    as "createdAt",
  a.resolved_at                                   as "resolvedAt",
  -- Calcul de la priorité de tri (critique = 1, warning = 2, info = 3)
  case a.severity
    when 'critical' then 1
    when 'warning'  then 2
    else 3
  end                                             as severity_rank,
  -- Action métier inline déduite du type d'alerte
  jsonb_build_object(
    'kind',    case a.type
                 when 'oil'      then 'schedule'
                 when 'brakes'   then 'immobilize'
                 when 'revision' then 'book'
                 when 'tires'    then 'order'
                 when 'ct'       then 'plan'
                 else 'schedule'
               end,
    'label',   case a.type
                 when 'oil'      then 'Planifier →'
                 when 'brakes'   then 'Immobiliser →'
                 when 'revision' then 'Réserver →'
                 when 'tires'    then 'Commander →'
                 when 'ct'       then 'Planifier CT →'
                 else 'Traiter →'
               end,
    'payload', jsonb_build_object(
                 'alertId',   a.id,
                 'vehicleId', a.vehicle_id,
                 'orgId',     a.org_id,
                 'type',      a.type
               )
  )                                               as action
from public.alerts a
join public.vehicles v on v.id = a.vehicle_id
where a.resolved_at is null;

-- RPC : KPIs agrégés pour le header
create or replace function public.get_kpi_summary(p_org_id uuid)
returns jsonb language sql security definer as $$
  select jsonb_build_object(
    'activeVehicles',  count(*) filter (where status = 'active'),
    'inMaintenance',   count(*) filter (where status = 'maintenance'),
    'criticalAlerts',  (
      select count(*) from alerts
      where org_id = p_org_id and severity = 'critical' and resolved_at is null
    ),
    'overdueServices', (
      select count(*) from alerts
      where org_id = p_org_id and type = 'ct' and resolved_at is null
    ),
    'deltaCritical',   (
      select count(*) from alerts
      where org_id = p_org_id and severity = 'critical'
        and created_at > now() - interval '24h' and resolved_at is null
    ),
    'deltaActive',     (
      select count(*) from vehicles
      where org_id = p_org_id and created_at > now() - interval '30d'
    )
  )
  from public.vehicles
  where org_id = p_org_id;
$$;
