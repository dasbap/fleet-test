-- =====================================================
-- Sécurité : politiques RLS restrictives (plus de "always true")
-- Corrige "RLS Policy Always True" sur organisations, flottes, flotte_adhesions, preuves_maintenance
-- =====================================================

-- ---------- ORGANISATIONS ----------
DROP POLICY IF EXISTS orgs_read_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_insert_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_update_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_delete_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_select_member ON organisations;
DROP POLICY IF EXISTS orgs_update_member ON organisations;
DROP POLICY IF EXISTS orgs_delete_manager_org ON organisations;

-- Lecture / modification : utilisateur membre d'au moins une flotte de cette org
CREATE POLICY orgs_select_member ON organisations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

CREATE POLICY orgs_update_member ON organisations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role IN ('manager'::public.role_type, 'organizer'::public.role_type)
    )
  )
  WITH CHECK (true);

-- Insertion : tout utilisateur authentifié (création première org / onboarding)
CREATE POLICY orgs_insert_authenticated ON organisations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Suppression : manager/organizer d'une flotte de cette org
CREATE POLICY orgs_delete_manager_org ON organisations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role IN ('manager'::public.role_type, 'organizer'::public.role_type)
    )
  );

-- ---------- FLOTTES ----------
DROP POLICY IF EXISTS fleets_read_authenticated ON flottes;
DROP POLICY IF EXISTS fleets_insert_authenticated ON flottes;
DROP POLICY IF EXISTS fleets_update_authenticated ON flottes;
DROP POLICY IF EXISTS fleets_delete_authenticated ON flottes;
DROP POLICY IF EXISTS flottes_select_manager_org ON flottes;
DROP POLICY IF EXISTS flottes_insert_manager_org_org ON flottes;
DROP POLICY IF EXISTS flottes_update_manager_org ON flottes;
DROP POLICY IF EXISTS flottes_delete_manager_org ON flottes;

-- Lecture / modification / suppression : manager ou organizer de la flotte
CREATE POLICY flottes_select_manager_org ON flottes
  FOR SELECT TO authenticated
  USING (has_role(id, 'manager'::public.role_type) OR has_role(id, 'organizer'::public.role_type));

-- Insertion : manager/organizer d'une flotte de cette org, ou première flotte de l'org (création initiale)
CREATE POLICY flottes_insert_manager_org_org ON flottes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flotte_adhesions fa
      JOIN flottes f ON f.id = fa.fleet_id
      WHERE f.org_id = flottes.org_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role IN ('manager'::public.role_type, 'organizer'::public.role_type)
    )
    OR NOT EXISTS (SELECT 1 FROM flottes f2 WHERE f2.org_id = flottes.org_id)
  );

CREATE POLICY flottes_update_manager_org ON flottes
  FOR UPDATE TO authenticated
  USING (has_role(id, 'manager'::public.role_type) OR has_role(id, 'organizer'::public.role_type))
  WITH CHECK (has_role(id, 'manager'::public.role_type) OR has_role(id, 'organizer'::public.role_type));

CREATE POLICY flottes_delete_manager_org ON flottes
  FOR DELETE TO authenticated
  USING (has_role(id, 'manager'::public.role_type) OR has_role(id, 'organizer'::public.role_type));

-- ---------- FLOTTE_ADHESIONS ----------
DROP POLICY IF EXISTS memberships_read_self ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_read_manager_org ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_select_self_or_manager_org ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_insert_authenticated ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_update_authenticated ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_delete_authenticated ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_insert_manager_org ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_update_manager_org ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_delete_manager_org ON flotte_adhesions;

-- Lecture : soi-même ou manager/organizer de la flotte (évite récursion via has_role)
CREATE POLICY memberships_select_self_or_manager_org ON flotte_adhesions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(fleet_id, 'manager'::public.role_type)
    OR has_role(fleet_id, 'organizer'::public.role_type)
  );

-- Insertion : uniquement manager ou organizer de la flotte (trigger handle_invitation_signup utilise SECURITY DEFINER)
CREATE POLICY memberships_insert_manager_org ON flotte_adhesions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(fleet_id, 'manager'::public.role_type) OR has_role(fleet_id, 'organizer'::public.role_type));

-- UPDATE / DELETE : déjà définis dans 20250206000007, recréer pour idempotence
CREATE POLICY memberships_update_manager_org ON flotte_adhesions
  FOR UPDATE TO authenticated
  USING (has_role(fleet_id, 'manager'::public.role_type) OR has_role(fleet_id, 'organizer'::public.role_type))
  WITH CHECK (has_role(fleet_id, 'manager'::public.role_type) OR has_role(fleet_id, 'organizer'::public.role_type));

CREATE POLICY memberships_delete_manager_org ON flotte_adhesions
  FOR DELETE TO authenticated
  USING (has_role(fleet_id, 'manager'::public.role_type) OR has_role(fleet_id, 'organizer'::public.role_type));

-- ---------- PREUVES_MAINTENANCE ----------
DROP POLICY IF EXISTS preuves_insertion_mec ON preuves_maintenance;

-- Insertion : uniquement si l'utilisateur a le rôle mechanic sur la flotte du travail
CREATE POLICY preuves_insertion_mec ON preuves_maintenance
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM travaux_maintenance t
      WHERE t.id = job_id
        AND has_role(t.fleet_id, 'mechanic'::public.role_type)
    )
  );

-- ---------- PLANS (catalogue) ----------
-- Si la table plans existe et a RLS activée, autoriser la lecture aux authentifiés
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
    DROP POLICY IF EXISTS plans_select_authenticated ON plans;
    CREATE POLICY plans_select_authenticated ON plans
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END;
$$;
