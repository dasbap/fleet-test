-- Compatibilité locale (db reset) pour la migration dashboard du 20260410090000.
-- Le dashboard historique s'appuie sur des objets EN (public.alerts, public.vehicles)
-- alors que le schéma actuel utilise des tables FR (alertes_automatiques, vehicules, flottes).
--
-- Objectif: éviter l'échec de compilation en local/staging en créant des vues de compatibilité.

create or replace view public.vehicles as
select
  v.id,
  f.org_id,
  v.registration                                   as plate,
  v.brand,
  v.model,
  case
    when v.status::text = 'blocked' then 'maintenance'
    else 'active'
  end                                              as status,
  v.created_at
from public.vehicules v
join public.flottes f on f.id = v.fleet_id;

create or replace view public.alerts as
select
  aa.id,
  f.org_id,
  aa.vehicle_id,
  aa.severity,
  aa.alert_type::text                               as type,
  aa.message,
  aa.created_at,
  aa.resolved_at
from public.alertes_automatiques aa
join public.flottes f on f.id = aa.fleet_id;

