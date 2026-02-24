-- =====================================================
-- SÉCURITÉ RLS + FONCTIONS — À exécuter dans l'ordre dans le SQL Editor
-- Copier TOUT le contenu de ce fichier (pas le nom du fichier) puis Run
-- =====================================================

-- ========== PARTIE 1 : Activer RLS sur toutes les tables ==========

DO $$
DECLARE
  tables text[] := ARRAY[
    'preuves_maintenance',
    'incidents',
    'listes_verification_maintenance',
    'plans',
    'creneaux_conducteurs',
    'clotures_creneaux',
    'jetons_qr',
    'organisations',
    'flottes'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END;
$$;

-- ========== PARTIE 2 : Politiques RLS restrictives ==========

-- ORGANISATIONS
DROP POLICY IF EXISTS orgs_read_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_insert_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_update_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_delete_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_select_member ON organisations;
DROP POLICY IF EXISTS orgs_update_member ON organisations;
DROP POLICY IF EXISTS orgs_delete_manager_org ON organisations;

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
        AND fa.role IN ('manager', 'organizer')
    )
  )
  WITH CHECK (true);

CREATE POLICY orgs_insert_authenticated ON organisations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY orgs_delete_manager_org ON organisations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM flottes f
      JOIN flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role IN ('manager', 'organizer')
    )
  );

-- FLOTTES
DROP POLICY IF EXISTS fleets_read_authenticated ON flottes;
DROP POLICY IF EXISTS fleets_insert_authenticated ON flottes;
DROP POLICY IF EXISTS fleets_update_authenticated ON flottes;
DROP POLICY IF EXISTS fleets_delete_authenticated ON flottes;
DROP POLICY IF EXISTS flottes_select_manager_org ON flottes;
DROP POLICY IF EXISTS flottes_insert_manager_org_org ON flottes;
DROP POLICY IF EXISTS flottes_update_manager_org ON flottes;
DROP POLICY IF EXISTS flottes_delete_manager_org ON flottes;

CREATE POLICY flottes_select_manager_org ON flottes
  FOR SELECT TO authenticated
  USING (has_role(id, 'manager') OR has_role(id, 'organizer'));

CREATE POLICY flottes_insert_manager_org_org ON flottes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flotte_adhesions fa
      JOIN flottes f ON f.id = fa.fleet_id
      WHERE f.org_id = flottes.org_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role IN ('manager', 'organizer')
    )
    OR NOT EXISTS (SELECT 1 FROM flottes f2 WHERE f2.org_id = flottes.org_id)
  );

CREATE POLICY flottes_update_manager_org ON flottes
  FOR UPDATE TO authenticated
  USING (has_role(id, 'manager') OR has_role(id, 'organizer'))
  WITH CHECK (has_role(id, 'manager') OR has_role(id, 'organizer'));

CREATE POLICY flottes_delete_manager_org ON flottes
  FOR DELETE TO authenticated
  USING (has_role(id, 'manager') OR has_role(id, 'organizer'));

-- FLOTTE_ADHESIONS
DROP POLICY IF EXISTS memberships_read_self ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_read_manager_org ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_select_self_or_manager_org ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_insert_authenticated ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_update_authenticated ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_delete_authenticated ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_insert_manager_org ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_update_manager_org ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_delete_manager_org ON flotte_adhesions;

CREATE POLICY memberships_select_self_or_manager_org ON flotte_adhesions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(fleet_id, 'manager')
    OR has_role(fleet_id, 'organizer')
  );

CREATE POLICY memberships_insert_manager_org ON flotte_adhesions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'));

CREATE POLICY memberships_update_manager_org ON flotte_adhesions
  FOR UPDATE TO authenticated
  USING (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'))
  WITH CHECK (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'));

CREATE POLICY memberships_delete_manager_org ON flotte_adhesions
  FOR DELETE TO authenticated
  USING (has_role(fleet_id, 'manager') OR has_role(fleet_id, 'organizer'));

-- PREUVES_MAINTENANCE
DROP POLICY IF EXISTS preuves_insertion_mec ON preuves_maintenance;

CREATE POLICY preuves_insertion_mec ON preuves_maintenance
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM travaux_maintenance t
      WHERE t.id = job_id
        AND has_role(t.fleet_id, 'mechanic')
    )
  );

-- PLANS
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

-- ========== PARTIE 3 : search_path sur les fonctions ==========

DROP FUNCTION IF EXISTS public.search_users(text, int);
DROP FUNCTION IF EXISTS close_shift(uuid, int, int, text, text, text);

CREATE OR REPLACE FUNCTION public.affecter_vehicule(
  p_flotte_id uuid,
  p_vehicule_id uuid,
  p_conducteur_utilisateur_id uuid,
  p_debute_a timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicule vehicules%ROWTYPE;
  v_affectation_id uuid;
BEGIN
  SELECT * INTO v_vehicule
  FROM vehicules
  WHERE id = p_vehicule_id AND fleet_id = p_flotte_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'vehicule_non_trouve'; END IF;
  IF v_vehicule.status = 'blocked' THEN RAISE EXCEPTION 'vehicule_bloque'; END IF;

  IF EXISTS (
    SELECT 1
    FROM affectations_vehicules a
    JOIN creneaux_conducteurs c ON c.assignment_id = a.id
    LEFT JOIN clotures_creneaux cl ON cl.shift_id = c.id
    WHERE a.vehicle_id = p_vehicule_id
      AND a.is_active = false
      AND c.status = 'closed'
      AND cl.id IS NULL
      AND c.ended_at > now() - interval '7 days'
  ) THEN
    RAISE EXCEPTION 'cloture_manquante_bloque_affectation';
  END IF;

  IF EXISTS (SELECT 1 FROM affectations_vehicules WHERE driver_user_id = p_conducteur_utilisateur_id AND is_active = true)
  THEN RAISE EXCEPTION 'conducteur_deja_affecte'; END IF;

  INSERT INTO affectations_vehicules(fleet_id, vehicle_id, driver_user_id, starts_at, created_by)
  VALUES (p_flotte_id, p_vehicule_id, p_conducteur_utilisateur_id, p_debute_a, auth.uid())
  RETURNING id INTO v_affectation_id;

  RETURN v_affectation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fermer_creneau(
  p_creneau_id uuid,
  p_km_fin int,
  p_revenu_declare int,
  p_mode_collecte text,
  p_type_preuve text,
  p_valeur_preuve text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE creneaux_conducteurs
    SET km_end = p_km_fin, ended_at = now(), status = 'closed'
  WHERE id = p_creneau_id;

  INSERT INTO clotures_creneaux(shift_id, revenue_declared, collection_mode, proof_type, proof_value)
  VALUES (p_creneau_id, p_revenu_declare, p_mode_collecte, p_type_preuve, p_valeur_preuve)
  ON CONFLICT (shift_id) DO UPDATE
    SET revenue_declared = excluded.revenue_declared,
        collection_mode = excluded.collection_mode,
        proof_type = excluded.proof_type,
        proof_value = excluded.proof_value,
        status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.rechercher_utilisateurs(
  p_terme_recherche text,
  p_limite int DEFAULT 20
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusee: Utilisateur doit etre authentifie.';
  END IF;

  IF p_limite > 100 THEN
    p_limite := 100;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    u.id as user_id,
    u.email,
    p.full_name,
    p.phone,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profils p ON p.user_id = u.id
  WHERE 
    (LOWER(u.email) LIKE LOWER('%' || p_terme_recherche || '%'))
    OR
    (p.full_name IS NOT NULL AND LOWER(p.full_name) LIKE LOWER('%' || p_terme_recherche || '%'))
  ORDER BY 
    CASE WHEN LOWER(u.email) = LOWER(p_terme_recherche) THEN 1 ELSE 2 END,
    u.created_at DESC
  LIMIT p_limite;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rechercher_utilisateurs(text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.trigger_verifier_statut_vehicule_actif()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ok' AND (OLD.status IS NULL OR OLD.status != 'ok') THEN
    PERFORM public.verifier_statut_vehicule_actif(NEW.id, NEW.status);
  END IF;

  RETURN NEW;
END;
$$;
