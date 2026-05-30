-- Réparation ops : recréer v_retention_cohorts avec org_id (aligné 20260412140000).
-- Idempotent : DROP puis CREATE.

BEGIN;

DROP VIEW IF EXISTS public.v_retention_cohorts CASCADE;

CREATE OR REPLACE VIEW public.v_retention_cohorts AS
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
cohorte AS (
  SELECT
    org_id,
    user_id,
    first_join_at,
    date_trunc('week', first_join_at AT TIME ZONE 'UTC')::date AS cohort_week
  FROM membres_org
),
cohorte_agg AS (
  SELECT
    c.org_id,
    c.cohort_week,
    count(*)::bigint AS cohort_size,
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM activite act
        WHERE act.org_id = c.org_id
          AND act.user_id = c.user_id
          AND act.ts >= c.first_join_at + interval '7 days'
      )
    )::bigint AS retained_d7,
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM activite act
        WHERE act.org_id = c.org_id
          AND act.user_id = c.user_id
          AND act.ts >= c.first_join_at + interval '30 days'
      )
    )::bigint AS retained_d30
  FROM cohorte c
  GROUP BY c.org_id, c.cohort_week
),
fleets_per_cohort AS (
  SELECT
    c.org_id,
    c.cohort_week,
    count(DISTINCT fa.fleet_id)::bigint AS fleets_in_cohort
  FROM cohorte c
  INNER JOIN public.flotte_adhesions fa ON fa.user_id = c.user_id AND fa.is_active = true
  INNER JOIN public.flottes f ON f.id = fa.fleet_id AND f.org_id = c.org_id
  GROUP BY c.org_id, c.cohort_week
),
clos_agg AS (
  SELECT
    ch.org_id,
    ch.cohort_week,
    count(*) FILTER (WHERE cl.created_at <= ch.first_join_at + interval '7 days')::bigint AS total_closures_d7,
    count(*) FILTER (WHERE cl.created_at <= ch.first_join_at + interval '30 days')::bigint AS total_closures_d30
  FROM cohorte ch
  INNER JOIN public.affectations_vehicules av
    ON av.driver_user_id = ch.user_id
  INNER JOIN public.flottes fl
    ON fl.id = av.fleet_id AND fl.org_id = ch.org_id
  INNER JOIN public.creneaux_conducteurs cr ON cr.assignment_id = av.id
  INNER JOIN public.clotures_creneaux cl ON cl.shift_id = cr.id
  GROUP BY ch.org_id, ch.cohort_week
)
SELECT
  ca.org_id,
  ca.cohort_week,
  ca.cohort_size,
  ca.retained_d7,
  ca.retained_d30,
  to_char(
    round(100.0 * ca.retained_d7::numeric / nullif(ca.cohort_size, 0), 2),
    'FM999999990.00'
  ) AS pct_d7,
  to_char(
    round(100.0 * ca.retained_d30::numeric / nullif(ca.cohort_size, 0), 2),
    'FM999999990.00'
  ) AS pct_d30,
  to_char(coalesce(cl.total_closures_d7, 0), 'FM999999990') AS total_closures_d7,
  to_char(coalesce(cl.total_closures_d30, 0), 'FM999999990') AS total_closures_d30,
  coalesce(fc.fleets_in_cohort, 0::bigint) AS fleets_in_cohort
FROM cohorte_agg ca
LEFT JOIN fleets_per_cohort fc
  ON fc.org_id = ca.org_id AND fc.cohort_week = ca.cohort_week
LEFT JOIN clos_agg cl
  ON cl.org_id = ca.org_id AND cl.cohort_week = ca.cohort_week;

COMMENT ON VIEW public.v_retention_cohorts IS
  'Cohortes hebdomadaires par org ; RLS sur la vue.';

ALTER VIEW public.v_retention_cohorts SET (security_invoker = true);
GRANT SELECT ON public.v_retention_cohorts TO authenticated;

COMMIT;
