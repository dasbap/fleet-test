-- Réparation : schéma distant parfois sans colonne org_id sur v_retention_kpis (vue obsolète).
-- Idempotent : CREATE OR REPLACE aligné sur 20260412140000_retention_analytics_views.sql

BEGIN;

-- CREATE OR REPLACE ne peut pas renommer/réordonner les colonnes si la vue existante diffère.
DROP VIEW IF EXISTS public.v_retention_kpis CASCADE;

CREATE VIEW public.v_retention_kpis AS
WITH membres_org AS (
  SELECT
    f.org_id,
    fa.user_id,
    min(fa.created_at) AS first_join_at
  FROM public.flotte_adhesions fa
  INNER JOIN public.flottes f ON f.id = fa.fleet_id
  WHERE fa.is_active = true
  GROUP BY f.org_id, fa.user_id
),
activite AS (
  SELECT mo.org_id, mo.user_id, c.started_at AS ts
  FROM membres_org mo
  INNER JOIN public.affectations_vehicules a
    ON a.driver_user_id = mo.user_id
   AND a.fleet_id IN (SELECT id FROM public.flottes f WHERE f.org_id = mo.org_id)
  INNER JOIN public.creneaux_conducteurs c ON c.assignment_id = a.id
  UNION ALL
  SELECT mo.org_id, mo.user_id, cl.created_at AS ts
  FROM membres_org mo
  INNER JOIN public.affectations_vehicules a
    ON a.driver_user_id = mo.user_id
   AND a.fleet_id IN (SELECT id FROM public.flottes f WHERE f.org_id = mo.org_id)
  INNER JOIN public.creneaux_conducteurs c ON c.assignment_id = a.id
  INNER JOIN public.clotures_creneaux cl ON cl.shift_id = c.id
),
premiere_activite AS (
  SELECT org_id, user_id, min(ts) AS first_activity_at
  FROM activite
  GROUP BY org_id, user_id
),
eligible AS (
  SELECT
    mo.*,
    (mo.first_join_at <= now() - interval '7 days') AS ok_d7,
    (mo.first_join_at <= now() - interval '30 days') AS ok_d30
  FROM membres_org mo
),
ret_d7 AS (
  SELECT e.org_id, e.user_id
  FROM eligible e
  WHERE e.ok_d7
    AND EXISTS (
      SELECT 1
      FROM activite act
      WHERE act.org_id = e.org_id
        AND act.user_id = e.user_id
        AND act.ts >= e.first_join_at + interval '7 days'
    )
),
ret_d30 AS (
  SELECT e.org_id, e.user_id
  FROM eligible e
  WHERE e.ok_d30
    AND EXISTS (
      SELECT 1
      FROM activite act
      WHERE act.org_id = e.org_id
        AND act.user_id = e.user_id
        AND act.ts >= e.first_join_at + interval '30 days'
    )
),
rolling AS (
  SELECT DISTINCT org_id, user_id
  FROM activite
  WHERE ts >= now() - interval '7 days'
),
rolling30 AS (
  SELECT DISTINCT org_id, user_id
  FROM activite
  WHERE ts >= now() - interval '30 days'
),
nouveaux AS (
  SELECT org_id, count(*)::bigint AS n
  FROM membres_org
  WHERE first_join_at >= now() - interval '7 days'
  GROUP BY org_id
),
jamais AS (
  SELECT mo.org_id, mo.user_id
  FROM membres_org mo
  LEFT JOIN premiere_activite p ON p.org_id = mo.org_id AND p.user_id = mo.user_id
  WHERE p.first_activity_at IS NULL
)
SELECT
  o.id AS org_id,
  (SELECT count(*)::bigint FROM membres_org m WHERE m.org_id = o.id) AS total_members,
  coalesce(n.n, 0::bigint) AS new_d7,
  (SELECT count(*)::bigint FROM ret_d7 r WHERE r.org_id = o.id) AS retained_ever_d7,
  (SELECT count(*)::bigint FROM ret_d30 r WHERE r.org_id = o.id) AS retained_ever_d30,
  (SELECT count(*)::bigint FROM rolling r WHERE r.org_id = o.id) AS active_rolling_7d,
  (SELECT count(*)::bigint FROM rolling30 r WHERE r.org_id = o.id) AS active_rolling_30d,
  (SELECT count(*)::bigint FROM jamais j WHERE j.org_id = o.id) AS never_activated,
  (SELECT count(*)::bigint FROM eligible e WHERE e.org_id = o.id AND e.ok_d7) AS eligible_d7,
  (SELECT count(*)::bigint FROM eligible e WHERE e.org_id = o.id AND e.ok_d30) AS eligible_d30
FROM public.organisations o
LEFT JOIN nouveaux n ON n.org_id = o.id;

COMMENT ON VIEW public.v_retention_kpis IS
  'KPIs rétention par org ; RLS sur la vue.';

ALTER VIEW public.v_retention_kpis SET (security_invoker = false);

GRANT SELECT ON public.v_retention_kpis TO authenticated;

COMMIT;
