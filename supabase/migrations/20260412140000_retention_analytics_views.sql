-- Analytics rétention E-Samba : vues agrégées par organisation.
-- security_invoker = off : agrégation avec le propriétaire de la vue, puis RLS sur la vue.

BEGIN;

CREATE OR REPLACE FUNCTION public.user_can_read_retention_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.flottes f
    INNER JOIN public.flotte_adhesions m
      ON m.fleet_id = f.id
     AND m.user_id = auth.uid()
     AND m.is_active = true
     AND m.role = 'organizer'::public.role_type
    WHERE f.org_id = p_org_id
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_read_retention_org(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_read_retention_org(uuid) TO authenticated;

DROP VIEW IF EXISTS public.v_activation_funnel CASCADE;
DROP VIEW IF EXISTS public.v_daily_active_users CASCADE;
DROP VIEW IF EXISTS public.v_retention_cohorts CASCADE;
DROP VIEW IF EXISTS public.v_retention_kpis CASCADE;

CREATE OR REPLACE VIEW public.v_retention_kpis AS
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
FROM public.organisations o;

COMMENT ON VIEW public.v_retention_kpis IS
  'KPIs rétention par org ; RLS sur la vue.';

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

CREATE OR REPLACE VIEW public.v_daily_active_users AS
WITH orgs AS (
  SELECT DISTINCT org_id FROM public.flottes
),
days AS (
  SELECT generate_series(
    (timezone('utc', now()))::date - 29,
    (timezone('utc', now()))::date,
    interval '1 day'
  )::date AS day
),
agg AS (
  SELECT
    f.org_id,
    (c.started_at AT TIME ZONE 'UTC')::date AS day,
    count(DISTINCT a.driver_user_id)::bigint AS dau,
    count(DISTINCT a.fleet_id)::bigint AS active_fleets,
    count(*)::bigint AS total_sessions
  FROM public.creneaux_conducteurs c
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  INNER JOIN public.flottes f ON f.id = a.fleet_id
  WHERE c.started_at IS NOT NULL
  GROUP BY f.org_id, (c.started_at AT TIME ZONE 'UTC')::date
)
SELECT
  o.org_id,
  d.day,
  coalesce(a.dau, 0::bigint) AS dau,
  coalesce(a.active_fleets, 0::bigint) AS active_fleets,
  coalesce(a.total_sessions, 0::bigint) AS total_sessions
FROM orgs o
CROSS JOIN days d
LEFT JOIN agg a ON a.org_id = o.org_id AND a.day = d.day;

COMMENT ON VIEW public.v_daily_active_users IS
  'DAU 30 jours (UTC) par org ; créneaux ouverts = sessions.';

CREATE OR REPLACE VIEW public.v_activation_funnel AS
WITH roles AS (
  SELECT unnest(ARRAY['driver','organizer','manager','mechanic']) AS role
),
orgs AS (
  SELECT DISTINCT org_id FROM public.flottes
),
inscrits AS (
  SELECT f.org_id, fa.user_id, fa.role::text AS role
  FROM public.flotte_adhesions fa
  INNER JOIN public.flottes f ON f.id = fa.fleet_id
  WHERE fa.is_active = true
),
ouvert AS (
  SELECT DISTINCT f.org_id, a.driver_user_id AS user_id
  FROM public.creneaux_conducteurs c
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  INNER JOIN public.flottes f ON f.id = a.fleet_id
),
ferme AS (
  SELECT DISTINCT f.org_id, a.driver_user_id AS user_id
  FROM public.clotures_creneaux cl
  INNER JOIN public.creneaux_conducteurs c ON c.id = cl.shift_id
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  INNER JOIN public.flottes f ON f.id = a.fleet_id
),
valide AS (
  SELECT DISTINCT f.org_id, a.driver_user_id AS user_id
  FROM public.clotures_creneaux cl
  INNER JOIN public.creneaux_conducteurs c ON c.id = cl.shift_id
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  INNER JOIN public.flottes f ON f.id = a.fleet_id
  WHERE cl.status = 'validated'::public.closure_status
)
SELECT
  o.org_id,
  r.role,
  (SELECT count(*)::bigint FROM inscrits i WHERE i.org_id = o.org_id AND i.role = r.role) AS inscribed,
  (SELECT count(*)::bigint
   FROM inscrits i
   WHERE i.org_id = o.org_id AND i.role = r.role
     AND EXISTS (SELECT 1 FROM ouvert x WHERE x.org_id = i.org_id AND x.user_id = i.user_id)
  ) AS opened_shift,
  (SELECT count(*)::bigint
   FROM inscrits i
   WHERE i.org_id = o.org_id AND i.role = r.role
     AND EXISTS (SELECT 1 FROM ferme x WHERE x.org_id = i.org_id AND x.user_id = i.user_id)
  ) AS closed_shift,
  (SELECT count(*)::bigint
   FROM inscrits i
   WHERE i.org_id = o.org_id AND i.role = r.role
     AND EXISTS (SELECT 1 FROM valide x WHERE x.org_id = i.org_id AND x.user_id = i.user_id)
  ) AS validated_shift
FROM orgs o
CROSS JOIN roles r;

COMMENT ON VIEW public.v_activation_funnel IS
  'Funnel par rôle et org ; RLS sur la vue.';

ALTER VIEW public.v_retention_kpis SET (security_invoker = false);
ALTER VIEW public.v_retention_cohorts SET (security_invoker = false);
ALTER VIEW public.v_daily_active_users SET (security_invoker = false);
ALTER VIEW public.v_activation_funnel SET (security_invoker = false);

ALTER VIEW public.v_retention_kpis ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_retention_cohorts ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_daily_active_users ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.v_activation_funnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v_retention_kpis_select ON public.v_retention_kpis;
CREATE POLICY v_retention_kpis_select ON public.v_retention_kpis
  FOR SELECT TO authenticated
  USING (public.user_can_read_retention_org(org_id));

DROP POLICY IF EXISTS v_retention_cohorts_select ON public.v_retention_cohorts;
CREATE POLICY v_retention_cohorts_select ON public.v_retention_cohorts
  FOR SELECT TO authenticated
  USING (public.user_can_read_retention_org(org_id));

DROP POLICY IF EXISTS v_daily_active_users_select ON public.v_daily_active_users;
CREATE POLICY v_daily_active_users_select ON public.v_daily_active_users
  FOR SELECT TO authenticated
  USING (public.user_can_read_retention_org(org_id));

DROP POLICY IF EXISTS v_activation_funnel_select ON public.v_activation_funnel;
CREATE POLICY v_activation_funnel_select ON public.v_activation_funnel
  FOR SELECT TO authenticated
  USING (public.user_can_read_retention_org(org_id));

GRANT SELECT ON public.v_retention_kpis TO authenticated;
GRANT SELECT ON public.v_retention_cohorts TO authenticated;
GRANT SELECT ON public.v_daily_active_users TO authenticated;
GRANT SELECT ON public.v_activation_funnel TO authenticated;

COMMIT;
