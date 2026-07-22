-- Reconstruit depuis le schéma remote (idempotent).
-- vues activite conducteur
-- Ne pas ré-appliquer sur une base déjà à jour : déjà présent dans schema_migrations.

CREATE OR REPLACE VIEW public.v_activite_conducteur
WITH (security_invoker = true) AS
SELECT
  c.id AS shift_id,
  a.fleet_id,
  a.vehicle_id,
  a.driver_user_id,
  c.km_start,
  c.km_end,
  GREATEST(COALESCE(c.km_end, c.km_start) - c.km_start, 0) AS km_parcourus,
  c.started_at,
  c.ended_at,
  CASE
    WHEN c.ended_at IS NOT NULL AND c.started_at IS NOT NULL
      THEN GREATEST((EXTRACT(epoch FROM (c.ended_at - c.started_at))::integer / 60), 0)
    ELSE 0
  END AS duree_conduite_minutes,
  cl.id AS closure_id,
  cl.status AS closure_status
FROM public.creneaux_conducteurs c
JOIN public.affectations_vehicules a ON a.id = c.assignment_id
LEFT JOIN public.clotures_creneaux cl ON cl.shift_id = c.id
WHERE c.status <> 'open'
  AND c.ended_at IS NOT NULL
  AND c.km_end IS NOT NULL;

COMMENT ON VIEW public.v_activite_conducteur IS
  'Activite par creneau cloture : km parcourus et duree de conduite.';

CREATE OR REPLACE VIEW public.v_activite_conducteur_quotidienne
WITH (security_invoker = true) AS
SELECT
  fleet_id,
  driver_user_id,
  vehicle_id,
  (started_at AT TIME ZONE 'UTC')::date AS activity_day,
  sum(km_parcourus) AS km_parcourus_total,
  sum(duree_conduite_minutes) AS duree_conduite_minutes_total,
  count(*) AS nombre_creneaux
FROM public.v_activite_conducteur
GROUP BY fleet_id, driver_user_id, vehicle_id, ((started_at AT TIME ZONE 'UTC')::date);

COMMENT ON VIEW public.v_activite_conducteur_quotidienne IS
  'Agreagation quotidienne (UTC) de l activite conducteur par flotte, vehicule et conducteur.';

GRANT SELECT ON TABLE public.v_activite_conducteur TO authenticated;
GRANT SELECT ON TABLE public.v_activite_conducteur_quotidienne TO authenticated;
