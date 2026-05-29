-- Réparation : v_activation_funnel manquait org_id/fleet_id/fleet_name en production.
-- v_retention_kpis recréée pour garantir la cohérence (dépend de même source).
-- Idempotent : DROP … CASCADE avant chaque CREATE.
-- Compatible Supabase SQL Editor.

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. v_activation_funnel  — expose org_id, fleet_id, fleet_name
-- ══════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.v_activation_funnel CASCADE;

CREATE VIEW public.v_activation_funnel AS
WITH inscrits AS (
  SELECT
    f.org_id,
    f.id        AS fleet_id,
    f.name      AS fleet_name,
    fa.user_id,
    fa.role::text AS role
  FROM public.flotte_adhesions fa
  INNER JOIN public.flottes f ON f.id = fa.fleet_id
  WHERE fa.is_active = true
),
ouvert AS (
  SELECT DISTINCT
    f.org_id,
    f.id AS fleet_id,
    a.driver_user_id AS user_id
  FROM public.creneaux_conducteurs c
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  INNER JOIN public.flottes f ON f.id = a.fleet_id
),
ferme AS (
  SELECT DISTINCT
    f.org_id,
    f.id AS fleet_id,
    a.driver_user_id AS user_id
  FROM public.clotures_creneaux cl
  INNER JOIN public.creneaux_conducteurs c ON c.id = cl.shift_id
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  INNER JOIN public.flottes f ON f.id = a.fleet_id
),
valide AS (
  SELECT DISTINCT
    f.org_id,
    f.id AS fleet_id,
    a.driver_user_id AS user_id
  FROM public.clotures_creneaux cl
  INNER JOIN public.creneaux_conducteurs c ON c.id = cl.shift_id
  INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  INNER JOIN public.flottes f ON f.id = a.fleet_id
  WHERE cl.status = 'validated'::public.closure_status
),
flottes_roles AS (
  SELECT DISTINCT
    f.org_id,
    f.id   AS fleet_id,
    f.name AS fleet_name,
    r.role
  FROM public.flottes f
  CROSS JOIN (SELECT unnest(ARRAY['driver','organizer','manager','mechanic']) AS role) r
)
SELECT
  fr.org_id,
  fr.fleet_id,
  fr.fleet_name,
  fr.role,
  (SELECT count(*)::bigint FROM inscrits i
   WHERE i.fleet_id = fr.fleet_id AND i.role = fr.role)                          AS inscribed,
  (SELECT count(*)::bigint FROM inscrits i
   WHERE i.fleet_id = fr.fleet_id AND i.role = fr.role
     AND EXISTS (SELECT 1 FROM ouvert x
                 WHERE x.fleet_id = i.fleet_id AND x.user_id = i.user_id))       AS opened_shift,
  (SELECT count(*)::bigint FROM inscrits i
   WHERE i.fleet_id = fr.fleet_id AND i.role = fr.role
     AND EXISTS (SELECT 1 FROM ferme x
                 WHERE x.fleet_id = i.fleet_id AND x.user_id = i.user_id))       AS closed_shift,
  (SELECT count(*)::bigint FROM inscrits i
   WHERE i.fleet_id = fr.fleet_id AND i.role = fr.role
     AND EXISTS (SELECT 1 FROM valide x
                 WHERE x.fleet_id = i.fleet_id AND x.user_id = i.user_id))       AS validated_shift
FROM flottes_roles fr;

COMMENT ON VIEW public.v_activation_funnel IS
  'Funnel activation par flotte, rôle et org. '
  'Colonnes : org_id, fleet_id, fleet_name, role, inscribed, opened_shift, closed_shift, validated_shift.';

ALTER VIEW public.v_activation_funnel SET (security_invoker = false);
GRANT SELECT ON public.v_activation_funnel TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- 2. v_retention_kpis  — recréée pour éviter incohérence CASCADE
-- ══════════════════════════════════════════════════════════════

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
  -- Créneaux ouverts
  SELECT mo.org_id, mo.user_id, c.started_at AS ts
  FROM membres_org mo
  INNER JOIN public.affectations_vehicules a
    ON a.driver_user_id = mo.user_id
   AND a.fleet_id IN (SELECT id FROM public.flottes f WHERE f.org_id = mo.org_id)
  INNER JOIN public.creneaux_conducteurs c ON c.assignment_id = a.id
  UNION ALL
  -- Créneaux clôturés
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
  FROM activite GROUP BY org_id, user_id
),
eligible AS (
  SELECT mo.*,
    (mo.first_join_at <= now() - interval '7 days')  AS ok_d7,
    (mo.first_join_at <= now() - interval '30 days') AS ok_d30
  FROM membres_org mo
),
ret_d7 AS (
  SELECT e.org_id, e.user_id FROM eligible e WHERE e.ok_d7
    AND EXISTS (SELECT 1 FROM activite act WHERE act.org_id = e.org_id AND act.user_id = e.user_id AND act.ts >= e.first_join_at + interval '7 days')
),
ret_d30 AS (
  SELECT e.org_id, e.user_id FROM eligible e WHERE e.ok_d30
    AND EXISTS (SELECT 1 FROM activite act WHERE act.org_id = e.org_id AND act.user_id = e.user_id AND act.ts >= e.first_join_at + interval '30 days')
),
rolling   AS (SELECT DISTINCT org_id, user_id FROM activite WHERE ts >= now() - interval '7 days'),
rolling30 AS (SELECT DISTINCT org_id, user_id FROM activite WHERE ts >= now() - interval '30 days'),
nouveaux  AS (SELECT org_id, count(*)::bigint AS n FROM membres_org WHERE first_join_at >= now() - interval '7 days' GROUP BY org_id),
jamais    AS (
  SELECT mo.org_id, mo.user_id FROM membres_org mo
  LEFT JOIN premiere_activite p ON p.org_id = mo.org_id AND p.user_id = mo.user_id
  WHERE p.first_activity_at IS NULL
)
SELECT
  o.id                                                                                        AS org_id,
  (SELECT count(*)::bigint FROM membres_org m  WHERE m.org_id  = o.id)                       AS total_members,
  coalesce(n.n, 0::bigint)                                                                    AS new_d7,
  (SELECT count(*)::bigint FROM ret_d7    r    WHERE r.org_id  = o.id)                       AS retained_ever_d7,
  (SELECT count(*)::bigint FROM ret_d30   r    WHERE r.org_id  = o.id)                       AS retained_ever_d30,
  (SELECT count(*)::bigint FROM rolling   r    WHERE r.org_id  = o.id)                       AS active_rolling_7d,
  (SELECT count(*)::bigint FROM rolling30 r    WHERE r.org_id  = o.id)                       AS active_rolling_30d,
  (SELECT count(*)::bigint FROM jamais    j    WHERE j.org_id  = o.id)                       AS never_activated,
  (SELECT count(*)::bigint FROM eligible  e    WHERE e.org_id  = o.id AND e.ok_d7)           AS eligible_d7,
  (SELECT count(*)::bigint FROM eligible  e    WHERE e.org_id  = o.id AND e.ok_d30)          AS eligible_d30
FROM public.organisations o
LEFT JOIN nouveaux n ON n.org_id = o.id;

COMMENT ON VIEW public.v_retention_kpis IS
  'KPIs rétention par org. Recréée par 20260528020000 pour cohérence avec v_activation_funnel.';

ALTER VIEW public.v_retention_kpis SET (security_invoker = false);
GRANT SELECT ON public.v_retention_kpis TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- 3. Reload PostgREST schema cache
-- ══════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

COMMIT;
