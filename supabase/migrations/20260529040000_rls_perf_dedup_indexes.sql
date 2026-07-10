-- ============================================================
-- PERF + CLEANUP - 2026-05-29
-- Fresh DB safe replay: each advisor statement is best effort.
-- ============================================================

CREATE OR REPLACE FUNCTION pg_temp.run_advisor_statement(p_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Advisor statement ignore: % [%]', SQLERRM, left(p_sql, 160);
END;
$$;

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "access_codes_select_admin" ON public.access_codes;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "access_codes_select_admin" ON public.access_codes
  FOR SELECT TO authenticated
  USING (is_platform_admin() OR (created_by = (SELECT auth.uid())));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "Lecture propre ligne" ON public.activation_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "Lecture propre ligne" ON public.activation_progress
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "Insertion propre ligne" ON public.activation_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "Insertion propre ligne" ON public.activation_progress
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "Mise Ã  jour propre ligne" ON public.activation_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "Mise Ã  jour propre ligne" ON public.activation_progress
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "affectations_lecture_conducteur_soi" ON public.affectations_vehicules;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "affectations_lecture_conducteur_soi" ON public.affectations_vehicules
  FOR SELECT
  USING (driver_user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "affectations_select_fleet" ON public.affectations_vehicules;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "affectations_select_fleet" ON public.affectations_vehicules
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = affectations_vehicules.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text])))
    OR (driver_user_id = (SELECT auth.uid()))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "affectations_insert_manager" ON public.affectations_vehicules;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "affectations_insert_manager" ON public.affectations_vehicules
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = affectations_vehicules.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text])))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "alertes_automatiques_select_roles" ON public.alertes_automatiques;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "alertes_automatiques_select_roles" ON public.alertes_automatiques
  FOR SELECT TO authenticated
  USING (
    (driver_user_id = (SELECT auth.uid()))
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "api_keys_org_owner" ON public.api_keys;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "api_keys_org_owner" ON public.api_keys
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM organisation_members om
      WHERE om.org_id = api_keys.org_id
        AND om.user_id = (SELECT auth.uid())
        AND om.is_active = true
        AND om.role = ANY (ARRAY['org_owner'::text, 'org_admin'::text]))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "billing_events_insert_service" ON public.billing_events;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "billing_events_insert_service" ON public.billing_events
  FOR INSERT
  WITH CHECK (((SELECT auth.jwt()) ->> 'role'::text) = 'service_role'::text);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "clotures_insertion_conducteur" ON public.clotures_creneaux;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "clotures_insertion_conducteur" ON public.clotures_creneaux
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM creneaux_conducteurs c
      JOIN affectations_vehicules a ON a.id = c.assignment_id
      WHERE c.id = clotures_creneaux.shift_id
        AND a.driver_user_id = (SELECT auth.uid()))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "clotures_insert_driver" ON public.clotures_creneaux;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "clotures_insert_driver" ON public.clotures_creneaux
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM creneaux_conducteurs cc
      JOIN affectations_vehicules av ON av.id = cc.assignment_id
      WHERE cc.id = clotures_creneaux.shift_id
        AND av.driver_user_id = (SELECT auth.uid()))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "clotures_select_driver" ON public.clotures_creneaux;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "clotures_select_driver" ON public.clotures_creneaux
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM creneaux_conducteurs cc
      JOIN affectations_vehicules av ON av.id = cc.assignment_id
      WHERE cc.id = clotures_creneaux.shift_id
        AND av.driver_user_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM creneaux_conducteurs cc
      JOIN affectations_vehicules av ON av.id = cc.assignment_id
      JOIN flotte_adhesions fa ON fa.fleet_id = av.fleet_id
      WHERE cc.id = clotures_creneaux.shift_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text])))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "clotures_update_manager" ON public.clotures_creneaux;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "clotures_update_manager" ON public.clotures_creneaux
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM creneaux_conducteurs cc
      JOIN affectations_vehicules av ON av.id = cc.assignment_id
      JOIN flotte_adhesions fa ON fa.fleet_id = av.fleet_id
      WHERE cc.id = clotures_creneaux.shift_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text])))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "coaching_driver_select" ON public.coaching_sessions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "coaching_driver_select" ON public.coaching_sessions
  FOR SELECT
  USING ((SELECT auth.uid()) = driver_user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet_members_read_controles" ON public.controles_journaliers;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet_members_read_controles" ON public.controles_journaliers
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet_members_create_controles" ON public.controles_journaliers;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet_members_create_controles" ON public.controles_journaliers
  FOR INSERT
  WITH CHECK (
    (inspected_by = (SELECT auth.uid()))
    AND (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet_members_update_controles" ON public.controles_journaliers;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet_members_update_controles" ON public.controles_journaliers
  FOR UPDATE
  USING (inspected_by = (SELECT auth.uid()) AND inspected_at > (now() - '24:00:00'::interval))
  WITH CHECK (inspected_by = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet_managers_update_controles" ON public.controles_journaliers;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet_managers_update_controles" ON public.controles_journaliers
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND fa.role = ANY (ARRAY['manager'::role_type, 'organizer'::role_type]))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND fa.role = ANY (ARRAY['manager'::role_type, 'organizer'::role_type]))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet_managers_delete_controles" ON public.controles_journaliers;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet_managers_delete_controles" ON public.controles_journaliers
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = controles_journaliers.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND fa.role = ANY (ARRAY['organizer'::role_type, 'manager'::role_type]))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "Select propre" ON public.conversion_events;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "Select propre" ON public.conversion_events
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "Insert propre" ON public.conversion_events;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "Insert propre" ON public.conversion_events
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "creneaux_lecture_conducteur" ON public.creneaux_conducteurs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "creneaux_lecture_conducteur" ON public.creneaux_conducteurs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM affectations_vehicules a
      WHERE a.id = creneaux_conducteurs.assignment_id
        AND a.driver_user_id = (SELECT auth.uid()))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "creneaux_insertion_conducteur" ON public.creneaux_conducteurs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "creneaux_insertion_conducteur" ON public.creneaux_conducteurs
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM affectations_vehicules a
      WHERE a.id = creneaux_conducteurs.assignment_id
        AND a.driver_user_id = (SELECT auth.uid())
        AND a.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "creneaux_select_driver" ON public.creneaux_conducteurs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "creneaux_select_driver" ON public.creneaux_conducteurs
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM affectations_vehicules av
      JOIN flotte_adhesions fa ON fa.fleet_id = av.fleet_id
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text])))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "creneaux_insert_driver" ON public.creneaux_conducteurs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "creneaux_insert_driver" ON public.creneaux_conducteurs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = (SELECT auth.uid())
        AND av.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "creneaux_update_driver" ON public.creneaux_conducteurs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "creneaux_update_driver" ON public.creneaux_conducteurs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = (SELECT auth.uid()))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "dashcam_alerts_fleet_select" ON public.dashcam_alerts;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "dashcam_alerts_fleet_select" ON public.dashcam_alerts
  FOR SELECT
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
    OR (has_role(fleet_id, 'driver'::role_type) AND ((SELECT auth.uid()) = driver_user_id))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "demo_onboarding_logs_insert" ON public.demo_onboarding_logs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "demo_onboarding_logs_insert" ON public.demo_onboarding_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "demo_sessions_own_read" ON public.demo_sessions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "demo_sessions_own_read" ON public.demo_sessions
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "failure_predictions_select_member" ON public.failure_predictions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "failure_predictions_select_member" ON public.failure_predictions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = failure_predictions.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "failure_pred_fleet_access" ON public.failure_predictions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "failure_pred_fleet_access" ON public.failure_predictions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = failure_predictions.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND fa.role = ANY (ARRAY['organizer'::role_type, 'manager'::role_type, 'mechanic'::role_type]))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "feedback_select_own" ON public.feedback;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "feedback_select_own" ON public.feedback
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "feedback_insert_own" ON public.feedback;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "feedback_insert_own" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = feedback.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "feedback_select_manager_admin" ON public.feedback;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "feedback_select_manager_admin" ON public.feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = feedback.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND fa.role = ANY (ARRAY['manager'::role_type, 'organizer'::role_type]))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "adhesions_lecture_soi" ON public.flotte_adhesions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "adhesions_lecture_soi" ON public.flotte_adhesions
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "adhesions_select_own" ON public.flotte_adhesions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "adhesions_select_own" ON public.flotte_adhesions
  FOR SELECT TO authenticated
  USING ((user_id = (SELECT auth.uid())) OR is_platform_admin());
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "adhesions_select_manager" ON public.flotte_adhesions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "adhesions_select_manager" ON public.flotte_adhesions
  FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR is_platform_admin()
    OR rbac_is_fleet_manager_or_above(fleet_id)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "memberships_select_self_or_manager_org" ON public.flotte_adhesions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "memberships_select_self_or_manager_org" ON public.flotte_adhesions
  FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'organizer'::role_type)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "rbac_adhesions_role_read" ON public.flotte_adhesions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "rbac_adhesions_role_read" ON public.flotte_adhesions
  FOR SELECT
  USING (
    is_platform_admin()
    OR (user_id = (SELECT auth.uid()))
    OR rbac_is_fleet_manager_or_above(fleet_id)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "adhesions_insert_organizer" ON public.flotte_adhesions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "adhesions_insert_organizer" ON public.flotte_adhesions
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = flotte_adhesions.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = 'organizer'::text))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "adhesions_update_organizer" ON public.flotte_adhesions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "adhesions_update_organizer" ON public.flotte_adhesions
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = flotte_adhesions.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text])))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "flottes_select_active_member" ON public.flottes;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "flottes_select_active_member" ON public.flottes
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = flottes.id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "flottes_select_member" ON public.flottes;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "flottes_select_member" ON public.flottes
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = flottes.id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "flottes_insert_manager_org_org" ON public.flottes;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "flottes_insert_manager_org_org" ON public.flottes
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (SELECT 1 FROM flotte_adhesions fa
      JOIN flottes f ON f.id = fa.fleet_id
      WHERE f.org_id = flottes.org_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND fa.role = ANY (ARRAY['manager'::role_type, 'organizer'::role_type])))
    OR (NOT (EXISTS (SELECT 1 FROM flottes f2 WHERE f2.org_id = flottes.org_id)))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "flottes_update_organizer" ON public.flottes;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "flottes_update_organizer" ON public.flottes
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = flottes.id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = 'organizer'::text))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "flottes_real_universe_isolation" ON public.flottes;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "flottes_real_universe_isolation" ON public.flottes
  FOR SELECT
  USING (
    CASE
      WHEN is_internal_user() THEN true
      WHEN is_temporary_user() THEN (is_demo = true)
      ELSE (
        (is_demo = false)
        AND (EXISTS (SELECT 1 FROM flotte_adhesions fa
          WHERE fa.fleet_id = flottes.id
            AND fa.user_id = (SELECT auth.uid())
            AND fa.is_active = true))
      )
    END
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "funnel events owner read" ON public.funnel_events;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "funnel events owner read" ON public.funnel_events
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "funnel events owner insert" ON public.funnel_events;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "funnel events owner insert" ON public.funnel_events
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "incidents_select_own" ON public.incidents;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "incidents_select_own" ON public.incidents
  FOR SELECT TO authenticated
  USING (driver_user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "incidents_select_manager" ON public.incidents;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "incidents_select_manager" ON public.incidents
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM vehicules v
      JOIN flotte_adhesions fa ON fa.fleet_id = v.fleet_id
      WHERE v.id = incidents.vehicle_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text])))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "incidents_insert_driver" ON public.incidents;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "incidents_insert_driver" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (driver_user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "incidents_insertion_conducteur" ON public.incidents;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "incidents_insertion_conducteur" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (
    (driver_user_id = (SELECT auth.uid()))
    AND (EXISTS (SELECT 1 FROM vehicules v
      JOIN affectations_vehicules av ON av.vehicle_id = v.id
        AND av.is_active = true
        AND av.driver_user_id = (SELECT auth.uid())
      WHERE v.id = incidents.vehicle_id))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "incidents_lecture_conducteur" ON public.incidents;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "incidents_lecture_conducteur" ON public.incidents
  FOR SELECT TO authenticated
  USING (
    (driver_user_id = (SELECT auth.uid()))
    OR (EXISTS (SELECT 1 FROM vehicules v
      JOIN affectations_vehicules av ON av.vehicle_id = v.id
        AND av.is_active = true
        AND av.driver_user_id = (SELECT auth.uid())
      WHERE v.id = incidents.vehicle_id))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "journal_carburant_select_member" ON public.journal_carburant;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "journal_carburant_select_member" ON public.journal_carburant
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = journal_carburant.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "journal_carburant_insert_driver" ON public.journal_carburant;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "journal_carburant_insert_driver" ON public.journal_carburant
  FOR INSERT TO authenticated
  WITH CHECK (
    ((SELECT auth.uid()) = driver_user_id)
    AND (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = journal_carburant.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "journal_carburant_update_owner" ON public.journal_carburant;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "journal_carburant_update_owner" ON public.journal_carburant
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = driver_user_id)
  WITH CHECK ((SELECT auth.uid()) = driver_user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "Users can manage own onboarding" ON public.onboarding_progress
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "onboarding_progress_select" ON public.onboarding_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "onboarding_progress_select" ON public.onboarding_progress
  FOR SELECT TO authenticated
  USING (((SELECT auth.uid()) = user_id) OR user_can_manage_org_onboarding(org_id));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "onboarding_progress_insert" ON public.onboarding_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "onboarding_progress_insert" ON public.onboarding_progress
  FOR INSERT TO authenticated
  WITH CHECK (((SELECT auth.uid()) = user_id) AND user_can_manage_org_onboarding(org_id));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "onboarding_progress_update" ON public.onboarding_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "onboarding_progress_update" ON public.onboarding_progress
  FOR UPDATE TO authenticated
  USING (((SELECT auth.uid()) = user_id) OR user_can_manage_org_onboarding(org_id))
  WITH CHECK (user_can_manage_org_onboarding(org_id));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "org_members_select" ON public.organisation_members;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "org_members_select" ON public.organisation_members
  FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR (EXISTS (SELECT 1 FROM organisation_members om2
      WHERE om2.org_id = organisation_members.org_id
        AND om2.user_id = (SELECT auth.uid())
        AND om2.is_active = true))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "org_members_insert" ON public.organisation_members;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "org_members_insert" ON public.organisation_members
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM organisation_members om2
      WHERE om2.org_id = organisation_members.org_id
        AND om2.user_id = (SELECT auth.uid())
        AND om2.role = ANY (ARRAY['org_owner'::text, 'org_admin'::text])
        AND om2.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "orgs_select_member" ON public.organisations;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "orgs_select_member" ON public.organisations
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "orgs_update_member" ON public.organisations;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "orgs_update_member" ON public.organisations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND fa.role = ANY (ARRAY['manager'::role_type, 'organizer'::role_type]))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND fa.role = ANY (ARRAY['manager'::role_type, 'organizer'::role_type]))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "orgs_insert_authenticated" ON public.organisations;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "orgs_insert_authenticated" ON public.organisations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND name IS NOT NULL
    AND length(TRIM(BOTH FROM name)) > 0
    AND country_code IS NOT NULL
    AND length(TRIM(BOTH FROM country_code)) > 0
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "orgs_delete_manager_org" ON public.organisations;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "orgs_delete_manager_org" ON public.organisations
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND fa.role = ANY (ARRAY['manager'::role_type, 'organizer'::role_type]))
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "organisations_select_member" ON public.organisations;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "organisations_select_member" ON public.organisations
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "organisations_update_organizer" ON public.organisations;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "organisations_update_organizer" ON public.organisations
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = 'organizer'::text))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "payment_attempts_select_manager" ON public.payment_attempts;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "payment_attempts_select_manager" ON public.payment_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.abonnements a
      WHERE a.payment_id = payment_attempts.payment_id
        AND a.fleet_id IN (
          SELECT fa.fleet_id FROM public.flotte_adhesions fa
          WHERE fa.user_id = (SELECT auth.uid()) AND fa.is_active = true
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.paiements p
      INNER JOIN public.flottes f ON f.org_id = p.org_id
      WHERE p.id = payment_attempts.payment_id
        AND f.id IN (
          SELECT fa.fleet_id FROM public.flotte_adhesions fa
          WHERE fa.user_id = (SELECT auth.uid()) AND fa.is_active = true
        )
    )
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "payment_attempts_service_role" ON public.payment_attempts;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "payment_attempts_service_role" ON public.payment_attempts
  FOR ALL
  USING (((SELECT auth.jwt()) ->> 'role'::text) = 'service_role'::text)
  WITH CHECK (((SELECT auth.jwt()) ->> 'role'::text) = 'service_role'::text);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet members can read own transactions" ON public.payment_transactions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet members can read own transactions" ON public.payment_transactions
  FOR SELECT
  USING (
    fleet_id IN (
      SELECT fa.fleet_id FROM flotte_adhesions fa
      WHERE fa.user_id = (SELECT auth.uid())
    )
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet members can create own transactions" ON public.payment_transactions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet members can create own transactions" ON public.payment_transactions
  FOR INSERT
  WITH CHECK (
    fleet_id IN (
      SELECT fa.fleet_id FROM flotte_adhesions fa
      WHERE fa.user_id = (SELECT auth.uid())
    )
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "service role can update transactions" ON public.payment_transactions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "service role can update transactions" ON public.payment_transactions
  FOR UPDATE
  USING (((SELECT auth.jwt()) ->> 'role'::text) = 'service_role'::text)
  WITH CHECK (((SELECT auth.jwt()) ->> 'role'::text) = 'service_role'::text);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "profils_select_own" ON public.profils;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "profils_select_own" ON public.profils
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "profils_insert_own" ON public.profils;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "profils_insert_own" ON public.profils
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "profils_update_own" ON public.profils;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "profils_update_own" ON public.profils
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "profils_insert_admin" ON public.profils;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "profils_insert_admin" ON public.profils
  FOR INSERT
  WITH CHECK (is_admin_or_dev() OR (current_setting('role'::text) = 'service_role'::text));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "scheduled_reports_select_policy" ON public.scheduled_reports;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "scheduled_reports_select_policy" ON public.scheduled_reports
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = scheduled_reports.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "scheduled_report_runs_select_policy" ON public.scheduled_report_runs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "scheduled_report_runs_select_policy" ON public.scheduled_report_runs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = scheduled_report_runs.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "scores_conducteurs_select_roles" ON public.scores_conducteurs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "scores_conducteurs_select_roles" ON public.scores_conducteurs
  FOR SELECT TO authenticated
  USING (
    (driver_user_id = (SELECT auth.uid()))
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'organizer'::role_type)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "scores_select_own" ON public.scores_conducteurs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "scores_select_own" ON public.scores_conducteurs
  FOR SELECT TO authenticated
  USING (driver_user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "scores_select_manager" ON public.scores_conducteurs;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "scores_select_manager" ON public.scores_conducteurs
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM flotte_adhesions fa
      WHERE fa.fleet_id = scores_conducteurs.fleet_id
        AND fa.user_id = (SELECT auth.uid())
        AND fa.is_active = true
        AND (fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text])))
    OR is_platform_admin()
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "security_notifications_select_own" ON public.security_notifications;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "security_notifications_select_own" ON public.security_notifications
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "security_notifications_update_own" ON public.security_notifications;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "security_notifications_update_own" ON public.security_notifications
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "session_events_select_own" ON public.session_events;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "session_events_select_own" ON public.session_events
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "Users can view their own events" ON public.system_events;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "Users can view their own events" ON public.system_events
  FOR SELECT
  USING (actor_user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet_members_read_transits" ON public.transits_cemac;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet_members_read_transits" ON public.transits_cemac
  FOR SELECT
  USING (
    fleet_id IN (
      SELECT flotte_adhesions.fleet_id FROM flotte_adhesions
      WHERE flotte_adhesions.user_id = (SELECT auth.uid()) AND flotte_adhesions.is_active = true
    )
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet_members_create_transits" ON public.transits_cemac;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet_members_create_transits" ON public.transits_cemac
  FOR INSERT
  WITH CHECK (
    fleet_id IN (
      SELECT flotte_adhesions.fleet_id FROM flotte_adhesions
      WHERE flotte_adhesions.user_id = (SELECT auth.uid()) AND flotte_adhesions.is_active = true
    )
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "fleet_members_update_transits" ON public.transits_cemac;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "fleet_members_update_transits" ON public.transits_cemac
  FOR UPDATE
  USING (
    fleet_id IN (
      SELECT flotte_adhesions.fleet_id FROM flotte_adhesions
      WHERE flotte_adhesions.user_id = (SELECT auth.uid()) AND flotte_adhesions.is_active = true
    )
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "tutorial_favorites_select_own" ON public.tutorial_favorites;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "tutorial_favorites_select_own" ON public.tutorial_favorites
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "tutorial_favorites_insert_own" ON public.tutorial_favorites;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "tutorial_favorites_insert_own" ON public.tutorial_favorites
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "tutorial_favorites_delete_own" ON public.tutorial_favorites;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "tutorial_favorites_delete_own" ON public.tutorial_favorites
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "tutorial_progress_select_own" ON public.tutorial_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "tutorial_progress_select_own" ON public.tutorial_progress
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "tutorial_progress_insert_own" ON public.tutorial_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "tutorial_progress_insert_own" ON public.tutorial_progress
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "tutorial_progress_update_own" ON public.tutorial_progress;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "tutorial_progress_update_own" ON public.tutorial_progress
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "tutorial_views_select_own" ON public.tutorial_views;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "tutorial_views_select_own" ON public.tutorial_views
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "tutorial_views_insert_own" ON public.tutorial_views;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "tutorial_views_insert_own" ON public.tutorial_views
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "user_sessions_select_own" ON public.user_sessions
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "user_sessions_insert_own" ON public.user_sessions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "user_sessions_insert_own" ON public.user_sessions
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "user_sessions_update_own" ON public.user_sessions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "user_sessions_update_own" ON public.user_sessions
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "users_select_self" ON public.users;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "users_select_self" ON public.users
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "users_update_self" ON public.users;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "vehicules_lecture_conducteur_affecte" ON public.vehicules;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "vehicules_lecture_conducteur_affecte" ON public.vehicules
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM affectations_vehicules a
      WHERE a.vehicle_id = vehicules.id
        AND a.driver_user_id = (SELECT auth.uid())
        AND a.is_active = true)
  );
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "vehicules_select_by_fleet" ON public.vehicules;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "vehicules_select_by_fleet" ON public.vehicules
  FOR SELECT TO authenticated
  USING (fleet_id = (((SELECT auth.jwt()) ->> 'fleet_id'::text))::uuid);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "vehicules_insert_by_fleet" ON public.vehicules;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "vehicules_insert_by_fleet" ON public.vehicules
  FOR INSERT TO authenticated
  WITH CHECK (fleet_id = (((SELECT auth.jwt()) ->> 'fleet_id'::text))::uuid);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "vehicules_update_by_fleet" ON public.vehicules;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "vehicules_update_by_fleet" ON public.vehicules
  FOR UPDATE TO authenticated
  USING (fleet_id = (((SELECT auth.jwt()) ->> 'fleet_id'::text))::uuid)
  WITH CHECK (fleet_id = (((SELECT auth.jwt()) ->> 'fleet_id'::text))::uuid);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "vehicules_delete_by_fleet" ON public.vehicules;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "vehicules_delete_by_fleet" ON public.vehicules
  FOR DELETE TO authenticated
  USING (fleet_id = (((SELECT auth.jwt()) ->> 'fleet_id'::text))::uuid);
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "wa_sessions_own" ON public.whatsapp_sessions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
CREATE POLICY "wa_sessions_own" ON public.whatsapp_sessions
  FOR ALL
  USING (user_id = (SELECT auth.uid()));
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "adhesions_select_own_clerk" ON public.flotte_adhesions;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "flottes_select_own_clerk"   ON public.flottes;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "profils_select_own_clerk"   ON public.profils;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "profils_select_self" ON public.profils;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "profils_insert_self" ON public.profils;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP POLICY IF EXISTS "profils_update_self" ON public.profils;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.idx_access_codes_code_active;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.audit_logs_fleet_id_idx;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.idx_clotures_shift;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.idx_clotures_status;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.idx_creneaux_assignment;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.idx_flottes_org;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.idx_incidents_driver;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.idx_incidents_vehicle;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
ALTER TABLE public.jetons_qr DROP CONSTRAINT IF EXISTS qr_tokens_token_hash_key;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.idx_onboarding_org;
$advisor$);

SELECT pg_temp.run_advisor_statement($advisor$
DROP INDEX IF EXISTS public.vehicules_fleet_id_idx;
$advisor$);
