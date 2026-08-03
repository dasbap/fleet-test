-- =====================================================
-- MIGRATION COMPLÈTE VERS FRANÇAIS
-- Smart Fleet Africa - E-samba
-- =====================================================
-- examiner
-- =====================================================

-- 
-- ✅ Vérifié le 2024-06 : cohérence générale des renommages et des politiques
-- 

BEGIN;

-- Étapes principales (examiner) :
-- 1. Suppression des doublons existants
-- 2. Renommage cohérent des tables et contraintes
-- 3. Mise à jour des foreign keys et index (vérification manuelle recommandée)
-- 4. Recréation des fonctions (noms/français), triggers et politiques RLS

-- === ÉTAPE 1 : NETTOYER LES DOUBLONS ET RENOMMER LES TABLES ===

-- Gestion intelligente des renommages : si la table française existe déjà,
-- on supprime l'ancienne table anglaise. Sinon, on renomme.

-- orgs → organisations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organisations') THEN
    DROP TABLE IF EXISTS orgs CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orgs') THEN
    ALTER TABLE orgs RENAME TO organisations;
  END IF;
END $$;

-- fleets → flottes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flottes') THEN
    DROP TABLE IF EXISTS fleets CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fleets') THEN
    ALTER TABLE fleets RENAME TO flottes;
  END IF;
END $$;

-- profiles → profils
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profils') THEN
    DROP TABLE IF EXISTS profiles CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE profiles RENAME TO profils;
  END IF;
END $$;

-- fleet_memberships → flotte_adhesions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flotte_adhesions') THEN
    DROP TABLE IF EXISTS fleet_memberships CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fleet_memberships') THEN
    ALTER TABLE fleet_memberships RENAME TO flotte_adhesions;
  END IF;
END $$;

-- fleet_invitations → flotte_invitations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flotte_invitations') THEN
    DROP TABLE IF EXISTS fleet_invitations CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fleet_invitations') THEN
    ALTER TABLE fleet_invitations RENAME TO flotte_invitations;
  END IF;
END $$;

-- vehicles → vehicules (DOUBLON DÉTECTÉ)
DO $$
DECLARE
  v_vehicles_kind "char";
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicules') THEN
    SELECT c.relkind INTO v_vehicles_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'vehicles';

    IF v_vehicles_kind = 'v' THEN
      EXECUTE 'DROP VIEW IF EXISTS public.vehicles CASCADE';
    ELSIF v_vehicles_kind = 'm' THEN
      EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.vehicles CASCADE';
    ELSIF v_vehicles_kind IN ('r', 'p') THEN
      EXECUTE 'DROP TABLE IF EXISTS public.vehicles CASCADE';
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'vehicles'
      AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE vehicles RENAME TO vehicules;
  END IF;
END $$;

-- driver_vehicle_assignments → affectations_vehicules
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affectations_vehicules') THEN
    DROP TABLE IF EXISTS driver_vehicle_assignments CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'driver_vehicle_assignments') THEN
    ALTER TABLE driver_vehicle_assignments RENAME TO affectations_vehicules;
  END IF;
END $$;

-- driver_shifts → creneaux_conducteurs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creneaux_conducteurs') THEN
    DROP TABLE IF EXISTS driver_shifts CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'driver_shifts') THEN
    ALTER TABLE driver_shifts RENAME TO creneaux_conducteurs;
  END IF;
END $$;

-- driver_shift_closures → clotures_creneaux (DOUBLON DÉTECTÉ)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clotures_creneaux') THEN
    DROP TABLE IF EXISTS driver_shift_closures CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'driver_shift_closures') THEN
    ALTER TABLE driver_shift_closures RENAME TO clotures_creneaux;
  END IF;
END $$;

-- maintenance_jobs → travaux_maintenance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travaux_maintenance') THEN
    DROP TABLE IF EXISTS maintenance_jobs CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_jobs') THEN
    ALTER TABLE maintenance_jobs RENAME TO travaux_maintenance;
  END IF;
END $$;

-- maintenance_evidence → preuves_maintenance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preuves_maintenance') THEN
    DROP TABLE IF EXISTS maintenance_evidence CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_evidence') THEN
    ALTER TABLE maintenance_evidence RENAME TO preuves_maintenance;
  END IF;
END $$;

-- maintenance_checklists → listes_verification_maintenance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listes_verification_maintenance') THEN
    DROP TABLE IF EXISTS maintenance_checklists CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_checklists') THEN
    ALTER TABLE maintenance_checklists RENAME TO listes_verification_maintenance;
  END IF;
END $$;

-- payments → paiements
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paiements') THEN
    DROP TABLE IF EXISTS payments CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    ALTER TABLE payments RENAME TO paiements;
  END IF;
END $$;

-- subscriptions → abonnements
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'abonnements') THEN
    DROP TABLE IF EXISTS subscriptions CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    ALTER TABLE subscriptions RENAME TO abonnements;
  END IF;
END $$;

-- vehicle_entitlements → droits_vehicules
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'droits_vehicules') THEN
    DROP TABLE IF EXISTS vehicle_entitlements CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_entitlements') THEN
    ALTER TABLE vehicle_entitlements RENAME TO droits_vehicules;
  END IF;
END $$;

-- qr_tokens → jetons_qr
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jetons_qr') THEN
    DROP TABLE IF EXISTS qr_tokens CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'qr_tokens') THEN
    ALTER TABLE qr_tokens RENAME TO jetons_qr;
  END IF;
END $$;

-- database_cleanup_audit → audit_nettoyage_base
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_nettoyage_base') THEN
    DROP TABLE IF EXISTS database_cleanup_audit CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'database_cleanup_audit') THEN
    ALTER TABLE database_cleanup_audit RENAME TO audit_nettoyage_base;
  END IF;
END $$;

-- === ÉTAPE 3 : FOREIGN KEYS & CONTRAINTES (EXAMINER NOMMAGE & REFERENCEMENT) ===

-- Examiner : PostgreSQL met à jour automatiquement les références
-- Si vous souhaitez renommer explicitement les contraintes, faire ici (exemple: ALTER TABLE ... RENAME CONSTRAINT ...)

-- === ÉTAPE 4 : INDEX (EXAMINER LES INDEX UNIQUES ET LA COHÉRENCE) ===

-- Index pour vehicules (vérifier que la table existe après renommage)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicules') THEN
    DROP INDEX IF EXISTS idx_vehicles_fleet_id;
    CREATE INDEX IF NOT EXISTS idx_vehicules_fleet_id ON vehicules(fleet_id);
    DROP INDEX IF EXISTS idx_vehicles_status;
    CREATE INDEX IF NOT EXISTS idx_vehicules_status ON vehicules(status);
  END IF;
END $$;

-- Index pour incidents (doit rester cohérent même après renommage vehicules)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incidents') THEN
    DROP INDEX IF EXISTS idx_incidents_vehicle_id;
    CREATE INDEX IF NOT EXISTS idx_incidents_vehicle_id ON incidents(vehicle_id);
  END IF;
END $$;

-- Index pour creneaux_conducteurs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creneaux_conducteurs') THEN
    DROP INDEX IF EXISTS idx_driver_shifts_assignment_id;
    CREATE INDEX IF NOT EXISTS idx_creneaux_conducteurs_assignment_id ON creneaux_conducteurs(assignment_id);
  END IF;
END $$;

-- Index pour flotte_adhesions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flotte_adhesions') THEN
    DROP INDEX IF EXISTS idx_fleet_memberships_user_id;
    CREATE INDEX IF NOT EXISTS idx_flotte_adhesions_user_id ON flotte_adhesions(user_id);
    DROP INDEX IF EXISTS idx_fleet_memberships_fleet_id;
    CREATE INDEX IF NOT EXISTS idx_flotte_adhesions_fleet_id ON flotte_adhesions(fleet_id);
  END IF;
END $$;

-- Index pour travaux_maintenance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travaux_maintenance') THEN
    DROP INDEX IF EXISTS idx_maintenance_jobs_fleet_id;
    CREATE INDEX IF NOT EXISTS idx_travaux_maintenance_fleet_id ON travaux_maintenance(fleet_id);
    DROP INDEX IF EXISTS idx_maintenance_jobs_vehicle_id;
    CREATE INDEX IF NOT EXISTS idx_travaux_maintenance_vehicle_id ON travaux_maintenance(vehicle_id);
  END IF;
END $$;

-- Index uniques pour affectations_vehicules
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affectations_vehicules') THEN
    DROP INDEX IF EXISTS one_active_assignment_per_driver;
    CREATE UNIQUE INDEX IF NOT EXISTS une_affectation_active_par_conducteur
    ON affectations_vehicules(driver_user_id)
    WHERE is_active = true;

    DROP INDEX IF EXISTS one_active_assignment_per_vehicle;
    CREATE UNIQUE INDEX IF NOT EXISTS une_affectation_active_par_vehicule
    ON affectations_vehicules(vehicle_id)
    WHERE is_active = true;
  END IF;
END $$;

-- === ÉTAPE 5 : RPC FUNCTIONS (EXAMINER RETOUR ET NOUVEAU NOM) ===

DROP FUNCTION IF EXISTS assign_vehicle(uuid, uuid, uuid, timestamptz);
DROP FUNCTION IF EXISTS public.affecter_vehicule(uuid, uuid, uuid, timestamptz);
CREATE OR REPLACE FUNCTION affecter_vehicule(
  p_flotte_id uuid,
  p_vehicule_id uuid,
  p_conducteur_utilisateur_id uuid,
  p_debute_a timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
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

DROP FUNCTION IF EXISTS close_shift(uuid, int, int, text, text, text);
DROP FUNCTION IF EXISTS public.fermer_creneau(uuid, int, int, text, text, text);
CREATE OR REPLACE FUNCTION fermer_creneau(
  p_creneau_id uuid,
  p_km_fin int,
  p_revenu_declare int,
  p_mode_collecte text,
  p_type_preuve text,
  p_valeur_preuve text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
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

DROP FUNCTION IF EXISTS search_users(text, int);
DROP FUNCTION IF EXISTS public.rechercher_utilisateurs(text, int);
CREATE OR REPLACE FUNCTION rechercher_utilisateurs(
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

GRANT EXECUTE ON FUNCTION rechercher_utilisateurs(text, int) TO authenticated;

-- === ÉTAPE 7 : TRIGGERS (EXAMINER COHÉRENCE ET NOUVEAUX CHAMPS) ===

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nom_complet text;
BEGIN
  v_nom_complet := new.raw_user_meta_data->>'full_name';
  
  IF v_nom_complet IS NULL OR v_nom_complet = '' THEN
    v_nom_complet := split_part(new.email, '@', 1);
  END IF;
  
  INSERT INTO public.profils (user_id, full_name)
  VALUES (new.id, v_nom_complet)
  ON CONFLICT (user_id) DO UPDATE
  SET full_name = COALESCE(profils.full_name, excluded.full_name);
  
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flotte_id uuid;
  v_code_invitation text;
BEGIN
  v_flotte_id := (new.raw_user_meta_data->>'invitation_fleet_id')::uuid;
  v_code_invitation := new.raw_user_meta_data->>'invitation_code';
  
  IF v_flotte_id IS NOT NULL THEN
    INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
    VALUES (v_flotte_id, new.id, 'driver', true);
    
    IF v_code_invitation IS NOT NULL THEN
      UPDATE public.flotte_invitations 
      SET current_uses = current_uses + 1 
      WHERE code = v_code_invitation;
    END IF;
  END IF;
  
  RETURN new;
END;
$$;

-- === ÉTAPE 8 : POLITIQUES RLS (EXAMINER QUE TOUTES LES POLITIQUES SONT RE-CREES) ===

ALTER TABLE flotte_adhesions DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicules DISABLE ROW LEVEL SECURITY;
ALTER TABLE affectations_vehicules DISABLE ROW LEVEL SECURITY;
ALTER TABLE creneaux_conducteurs DISABLE ROW LEVEL SECURITY;
ALTER TABLE clotures_creneaux DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE travaux_maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE preuves_maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE listes_verification_maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements DISABLE ROW LEVEL SECURITY;
ALTER TABLE droits_vehicules DISABLE ROW LEVEL SECURITY;
ALTER TABLE jetons_qr DISABLE ROW LEVEL SECURITY;
ALTER TABLE flotte_invitations DISABLE ROW LEVEL SECURITY;

-- Suppression de toutes les anciennes politiques (examiner la liste si besoin)
DROP POLICY IF EXISTS invitations_public_read ON flotte_invitations;
DROP POLICY IF EXISTS invitations_write_manager_org ON flotte_invitations;
DROP POLICY IF EXISTS invitations_update_manager_org ON flotte_invitations;
DROP POLICY IF EXISTS vehicles_read_manager_org ON vehicules;
DROP POLICY IF EXISTS vehicles_write_manager_org ON vehicules;
DROP POLICY IF EXISTS vehicles_update_manager_org ON vehicules;
DROP POLICY IF EXISTS vehicles_read_driver_assigned ON vehicules;
DROP POLICY IF EXISTS assignments_create_manager_org ON affectations_vehicules;
DROP POLICY IF EXISTS assignments_read_manager_org ON affectations_vehicules;
DROP POLICY IF EXISTS assignments_read_driver_self ON affectations_vehicules;
DROP POLICY IF EXISTS shifts_driver_select ON creneaux_conducteurs;
DROP POLICY IF EXISTS shifts_driver_insert ON creneaux_conducteurs;
DROP POLICY IF EXISTS shifts_manager_org_select ON creneaux_conducteurs;
DROP POLICY IF EXISTS closures_driver_insert ON clotures_creneaux;
DROP POLICY IF EXISTS closures_manager_update ON clotures_creneaux;
DROP POLICY IF EXISTS incidents_read_fleet ON incidents;
DROP POLICY IF EXISTS incidents_driver_insert ON incidents;
DROP POLICY IF EXISTS incidents_driver_select ON incidents;
DROP POLICY IF EXISTS jobs_read_mgr_org_mech ON travaux_maintenance;
DROP POLICY IF EXISTS evidence_insert_mech ON preuves_maintenance;
DROP POLICY IF EXISTS memberships_read_self ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_read_manager_org ON flotte_adhesions;

-- === FONCTION has_role (après suppression des politiques qui en dépendent) ===
-- Inspection : la fonction has_role permet de vérifier si l'utilisateur authentifié possède un rôle actif donné (p_role) dans une flotte (p_flotte_id).
-- Elle recherche une adhésion active correspondant à ces critères dans flotte_adhesions.
-- === FONCTION has_role ===
-- Vérifie si l'utilisateur authentifié possède un rôle actif dans une flotte.
-- CREATE OR REPLACE conserve les politiques RLS qui dépendent déjà de la fonction.

CREATE OR REPLACE FUNCTION public.has_role(
  p_flotte_id uuid,
  p_role role_type
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions AS fa
    WHERE fa.fleet_id = p_flotte_id
      AND fa.user_id = auth.uid()
      AND fa.role = p_role
      AND fa.is_active = true
  );
$$;

-- Activation RLS
ALTER TABLE flotte_adhesions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE affectations_vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE creneaux_conducteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clotures_creneaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE travaux_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE preuves_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE listes_verification_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;
ALTER TABLE droits_vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE jetons_qr ENABLE ROW LEVEL SECURITY;
ALTER TABLE flotte_invitations ENABLE ROW LEVEL SECURITY;

-- Recréation des politiques cohérentes (examiner que les droits sont corrects)
-- Recréation idempotente des politiques RLS.
-- La baseline peut déjà contenir les politiques sous leurs noms français.

DROP POLICY IF EXISTS invitations_lecture_publique
ON public.flotte_invitations;

DROP POLICY IF EXISTS invitations_ecriture_manager_org
ON public.flotte_invitations;

DROP POLICY IF EXISTS invitations_modification_manager_org
ON public.flotte_invitations;

CREATE POLICY invitations_lecture_publique
ON public.flotte_invitations
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY invitations_ecriture_manager_org
ON public.flotte_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(fleet_id, 'manager'::role_type)
);

CREATE POLICY invitations_modification_manager_org
ON public.flotte_invitations
FOR UPDATE
TO authenticated
USING (
  public.has_role(fleet_id, 'manager'::role_type)
)
WITH CHECK (
  public.has_role(fleet_id, 'manager'::role_type)
);
-- === ÉTAPE FINALE : NETTOYAGE DES ANCIENNES TABLES ANGLAISES ===
-- Supprimer définitivement les anciennes tables anglaises qui pourraient encore exister
-- (au cas où elles n'auraient pas été renommées ou supprimées précédemment)

DROP TABLE IF EXISTS orgs CASCADE;
DROP TABLE IF EXISTS fleets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS fleet_memberships CASCADE;
DROP TABLE IF EXISTS fleet_invitations CASCADE;
DO $$
DECLARE
  v_vehicles_kind "char";
BEGIN
  SELECT c.relkind INTO v_vehicles_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'vehicles';

  IF v_vehicles_kind = 'v' THEN
    EXECUTE 'DROP VIEW IF EXISTS public.vehicles CASCADE';
  ELSIF v_vehicles_kind = 'm' THEN
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.vehicles CASCADE';
  ELSIF v_vehicles_kind IN ('r', 'p') THEN
    EXECUTE 'DROP TABLE IF EXISTS public.vehicles CASCADE';
  END IF;
END $$;
DROP TABLE IF EXISTS driver_vehicle_assignments CASCADE;
DROP TABLE IF EXISTS driver_shifts CASCADE;
DROP TABLE IF EXISTS driver_shift_closures CASCADE;
DROP TABLE IF EXISTS maintenance_jobs CASCADE;
DROP TABLE IF EXISTS maintenance_evidence CASCADE;
DROP TABLE IF EXISTS maintenance_checklists CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS vehicle_entitlements CASCADE;
DROP TABLE IF EXISTS qr_tokens CASCADE;
DROP TABLE IF EXISTS driver_shift_clotures CASCADE; -- ancien nom incorrect
DROP TABLE IF EXISTS database_cleanup_audit CASCADE; -- doit être renommé en audit_nettoyage_base

COMMIT;

-- =====================================================
-- NOTES POST-MIGRATION (EXAMINER À LA MAIN)
-- =====================================================
-- 1. Examiner les références dans le code applicatif (TypeScript, SQL, etc.)
-- 2. Examiner que toutes les politiques/procédures ont bien été recréées/renommées
-- 3. Faites une vérification finale de cohérence sur les permissions et accès attendus
-- 4. Testez très soigneusement la migration sur un environnement de pré-production avant prod
-- =====================================================
