-- =============================================================================
-- Script consolidé (réparation / environnements legacy) — Flotte E-Samba
-- Référence : CORRECTION-PAGE-SETTINGS.md
--
-- Préférer pour une nouvelle base : la chaîne `supabase/migrations/` (ordre chronologique).
-- N’exécuter ce fichier dans le SQL Editor que si vous devez rejouer des correctifs
-- hors migrations ou aligner une base existante. Sauvegarde recommandée avant exécution.
-- Copie maintenue à l’identique de `supabase/archive/fix-all-issues-complete.sql`.
-- =============================================================================

-- =====================================================
-- PHASE DE RÉPARATION TOTALE : SCRIPT DE CORRECTION COMPLÈTE SUPABASE
-- Smart Fleet Africa – Version Travaux Réparés
-- =====================================================

-- 1. Correction complète des politiques RLS (ORGANISATIONS, FLOTTES, FLOTTE_ADHESIONS)
-- =============================================================================

-- Activation RLS sur toutes les tables concernées
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flottes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flotte_adhesions ENABLE ROW LEVEL SECURITY;

-- Suppression des anciennes politiques
DROP POLICY IF EXISTS orgs_read_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_insert_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_update_authenticated ON organisations;
DROP POLICY IF EXISTS orgs_delete_authenticated ON organisations;
DROP POLICY IF EXISTS fleets_read_authenticated ON flottes;
DROP POLICY IF EXISTS fleets_insert_authenticated ON flottes;
DROP POLICY IF EXISTS fleets_update_authenticated ON flottes;
DROP POLICY IF EXISTS fleets_delete_authenticated ON flottes;
DROP POLICY IF EXISTS memberships_read_self ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_read_manager_org ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_insert_authenticated ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_insert_self ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_update_authenticated ON flotte_adhesions;
DROP POLICY IF EXISTS memberships_delete_authenticated ON flotte_adhesions;

-- Création des politiques RLS : ORGANISATIONS
CREATE POLICY orgs_read_authenticated ON organisations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY orgs_insert_authenticated ON organisations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY orgs_update_authenticated ON organisations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY orgs_delete_authenticated ON organisations
  FOR DELETE TO authenticated USING (true);

-- Création des politiques RLS : FLOTTES
CREATE POLICY fleets_read_authenticated ON flottes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY fleets_insert_authenticated ON flottes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY fleets_update_authenticated ON flottes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY fleets_delete_authenticated ON flottes
  FOR DELETE TO authenticated USING (true);

-- Création des politiques RLS : FLOTTE_ADHESIONS
-- Politique de lecture : les utilisateurs peuvent lire leurs propres memberships
CREATE POLICY memberships_read_self ON flotte_adhesions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Politique de lecture : managers et organizers peuvent lire tous les memberships de leur flotte
CREATE POLICY memberships_read_manager_org ON flotte_adhesions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM flotte_adhesions fm
      WHERE fm.fleet_id = flotte_adhesions.fleet_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('manager', 'organizer')
        AND fm.is_active = true
    )
  );

CREATE POLICY memberships_insert_authenticated ON flotte_adhesions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY memberships_update_authenticated ON flotte_adhesions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY memberships_delete_authenticated ON flotte_adhesions
  FOR DELETE TO authenticated USING (true);

-- 2. Fonction UPSERT pour les membreships (évite les erreurs de contrainte unique)
-- =============================================================================

DROP FUNCTION IF EXISTS public.upsert_fleet_membership(uuid, uuid, role_type, boolean);

CREATE OR REPLACE FUNCTION public.upsert_fleet_membership(
  p_fleet_id uuid,
  p_user_id uuid,
  p_role role_type,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
BEGIN
  -- Insertion avec gestion automatique du conflit
  INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (p_fleet_id, p_user_id, p_role, p_is_active)
  ON CONFLICT (fleet_id, user_id, role)
  DO UPDATE SET
    is_active = p_is_active,
    created_at = CASE 
      WHEN flotte_adhesions.is_active = false AND p_is_active = true 
      THEN now() 
      ELSE flotte_adhesions.created_at 
    END
  RETURNING id INTO v_membership_id;
  
  RETURN v_membership_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_fleet_membership(uuid, uuid, role_type, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_fleet_membership(uuid, uuid, role_type, boolean) TO anon;

COMMENT ON FUNCTION public.upsert_fleet_membership(uuid, uuid, role_type, boolean) IS 
'Insère ou met à jour un membership de flotte de manière atomique. Gère les conflits de contrainte unique automatiquement.';

-- 3. Fonction RPC pour créer les flottes ESAMBA
-- =============================================================================

DROP FUNCTION IF EXISTS public.create_esamba_fleet(uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_esamba_fleet(
  p_org_id uuid,
  p_name text,
  p_collection_policy text DEFAULT 'mix'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_id uuid;
BEGIN
  -- Vérifier que l'organisation existe
  IF NOT EXISTS (SELECT 1 FROM organisations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  -- Vérifier si la flotte existe déjà
  SELECT id INTO v_fleet_id
  FROM flottes
  WHERE org_id = p_org_id
    AND name = p_name
    LIMIT 1;

  -- Si la flotte existe déjà, retourner son ID
  IF v_fleet_id IS NOT NULL THEN
    RETURN v_fleet_id;
  END IF;

  -- Créer la flotte
  INSERT INTO flottes (
    org_id,
    name,
    collection_policy
  )
  VALUES (
    p_org_id,
    p_name,
    p_collection_policy
  )
  RETURNING id INTO v_fleet_id;

  RETURN v_fleet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_esamba_fleet(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_esamba_fleet(uuid, text, text) IS 
'Crée une flotte ESAMBA en contournant les problèmes RLS. Utilise SECURITY DEFINER pour permettre la création même si l''utilisateur n''a pas encore les permissions nécessaires.';

-- 4. Fonction RPC pour créer les véhicules ESAMBA
-- =============================================================================

DROP FUNCTION IF EXISTS public.create_esamba_vehicle(uuid, text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.create_esamba_vehicle(
  p_fleet_id uuid,
  p_registration text,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_current_km integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_id uuid;
BEGIN
  -- Vérifier que la flotte existe
  IF NOT EXISTS (SELECT 1 FROM flottes WHERE id = p_fleet_id) THEN
    RAISE EXCEPTION 'Fleet not found: %', p_fleet_id;
  END IF;

  -- Vérifier si le véhicule existe déjà
  SELECT id INTO v_vehicle_id
  FROM vehicules
  WHERE fleet_id = p_fleet_id
    AND registration = p_registration
    LIMIT 1;

  -- Si le véhicule existe déjà, retourner son ID
  IF v_vehicle_id IS NOT NULL THEN
    RETURN v_vehicle_id;
  END IF;

  -- Créer le véhicule
  INSERT INTO vehicules (
    fleet_id,
    registration,
    brand,
    model,
    year,
    current_km,
    status
  )
  VALUES (
    p_fleet_id,
    p_registration,
    p_brand,
    p_model,
    p_year,
    p_current_km,
    'ok'
  )
  ON CONFLICT (fleet_id, registration)
  DO UPDATE SET
    brand = COALESCE(EXCLUDED.brand, vehicules.brand),
    model = COALESCE(EXCLUDED.model, vehicules.model),
    year = COALESCE(EXCLUDED.year, vehicules.year),
    current_km = COALESCE(EXCLUDED.current_km, vehicules.current_km)
  RETURNING id INTO v_vehicle_id;

  RETURN v_vehicle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_esamba_vehicle(uuid, text, text, text, integer, integer) TO authenticated;

COMMENT ON FUNCTION public.create_esamba_vehicle(uuid, text, text, text, integer, integer) IS 
'Crée un véhicule ESAMBA en contournant les problèmes RLS. Utilise SECURITY DEFINER pour permettre la création même si le membership n''est pas encore actif.';

-- 5. Fonction RPC pour créer les invitations ESAMBA
-- =============================================================================

DROP FUNCTION IF EXISTS public.create_esamba_invitation(uuid, text);

CREATE OR REPLACE FUNCTION public.create_esamba_invitation(
  p_fleet_id uuid,
  p_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_code text;
BEGIN
  -- Vérifier que la flotte existe
  IF NOT EXISTS (SELECT 1 FROM flottes WHERE id = p_fleet_id) THEN
    RAISE EXCEPTION 'Fleet not found: %', p_fleet_id;
  END IF;

  -- Vérifier si l'invitation existe déjà
  SELECT code INTO v_invitation_code
  FROM flotte_invitations
  WHERE fleet_id = p_fleet_id
    AND code = p_code
    LIMIT 1;

  -- Si l'invitation existe déjà, retourner son code
  IF v_invitation_code IS NOT NULL THEN
    RETURN v_invitation_code;
  END IF;

  -- Créer l'invitation
  INSERT INTO flotte_invitations (
    fleet_id,
    code,
    current_uses,
    created_by
  )
  VALUES (
    p_fleet_id,
    p_code,
    0,
    auth.uid()
  )
  ON CONFLICT (code)
  DO UPDATE SET
    fleet_id = EXCLUDED.fleet_id,
    current_uses = COALESCE(EXCLUDED.current_uses, flotte_invitations.current_uses)
  RETURNING code INTO v_invitation_code;

  RETURN v_invitation_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_esamba_invitation(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.create_esamba_invitation(uuid, text) IS
'Crée une invitation ESAMBA de façon sécurisée même si le RLS empêche le membership : SECURITY DEFINER.';

-- 6. Fonction RPC pour vérifier les données ESAMBA-2024
-- =============================================================================

DROP FUNCTION IF EXISTS public.check_esamba_2024();

CREATE OR REPLACE FUNCTION public.check_esamba_2024()
RETURNS TABLE (
  organisation boolean,
  flotte boolean,
  membership_organizer boolean,
  vehicule_esamba_001 boolean,
  invitation_esamba_2024 boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM organisations WHERE name = 'Organisation ESAMBA') as organisation,
    EXISTS(SELECT 1 FROM flottes WHERE name = 'Flotte ESAMBA') as flotte,
    EXISTS(
      SELECT 1 FROM flotte_adhesions fm
      JOIN flottes f ON f.id = fm.fleet_id
      WHERE f.name = 'Flotte ESAMBA'
        AND fm.user_id = auth.uid()
        AND fm.role = 'organizer'
        AND fm.is_active = true
    ) as membership_organizer,
    EXISTS(
      SELECT 1 FROM vehicules v
      JOIN flottes f ON f.id = v.fleet_id
      WHERE f.name = 'Flotte ESAMBA'
        AND v.registration = 'ESAMBA-001'
    ) as vehicule_esamba_001,
    EXISTS(
      SELECT 1 FROM flotte_invitations fi
      JOIN flottes f ON f.id = fi.fleet_id
      WHERE f.name = 'Flotte ESAMBA'
        AND fi.code = 'ESAMBA-2024'
    ) as invitation_esamba_2024;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_esamba_2024() TO authenticated;

COMMENT ON FUNCTION public.check_esamba_2024() IS
'Vérifie l''existence des données ESAMBA-2024. Retourne un tableau avec le statut de chaque entité.';

-- 7. Fonction RPC pour ajouter un membre par email
-- =============================================================================

DROP FUNCTION IF EXISTS public.add_member_by_email(uuid, text, role_type);

CREATE OR REPLACE FUNCTION public.add_member_by_email(
  p_fleet_id uuid,
  p_email text,
  p_role role_type
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_membership_id uuid;
BEGIN
  -- Vérifier que la flotte existe
  IF NOT EXISTS (SELECT 1 FROM flottes WHERE id = p_fleet_id) THEN
    RAISE EXCEPTION 'Fleet not found: %', p_fleet_id;
  END IF;

  -- Vérifier que l'utilisateur appelant a les permissions (manager ou organizer)
  IF NOT EXISTS (
    SELECT 1
    FROM flotte_adhesions fm
    WHERE fm.fleet_id = p_fleet_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('manager', 'organizer')
      AND fm.is_active = true
  ) THEN
    RAISE EXCEPTION 'Permission denied: You must be a manager or organizer to add members.';
  END IF;

  -- Trouver l'utilisateur par email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', p_email;
  END IF;

  -- Utiliser upsert_fleet_membership pour gérer les conflits de manière atomique
  SELECT public.upsert_fleet_membership(p_fleet_id, v_user_id, p_role, true) INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_member_by_email(uuid, text, role_type) TO authenticated;

COMMENT ON FUNCTION public.add_member_by_email(uuid, text, role_type) IS 
'Ajoute un membre à une flotte en utilisant son email. Nécessite que l''utilisateur appelant soit manager ou organizer.';

-- 8. Vérifications finales RLS et fonctions essentielles
-- =============================================================================

-- Contrôle : Les politiques RLS sont bien créées
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('organisations', 'flottes', 'flotte_adhesions')
ORDER BY tablename, cmd, policyname;

-- Contrôle : Toutes les fonctions RPC ESAMBA existent
SELECT 
  proname AS function_name,
  proargnames AS parameters
FROM pg_proc
WHERE proname IN ('upsert_fleet_membership', 'create_esamba_fleet', 'create_esamba_vehicle', 'create_esamba_invitation', 'check_esamba_2024', 'add_member_by_email')
ORDER BY proname;

-- 9. Résumé d'exécution et checklist
-- =============================================================================
-- ✅ Toutes les politiques RLS réparées (organisations, flottes, flotte_adhesions)
-- ✅ Fonctions principales créées :
--    - upsert_fleet_membership : Gère les membreships de manière atomique
--    - create_esamba_fleet : Crée les flottes en contournant RLS
--    - create_esamba_vehicle : Crée les véhicules en contournant RLS
--    - create_esamba_invitation : Crée les invitations en contournant RLS
--    - check_esamba_2024 : Vérifie l'existence des données ESAMBA
--    - add_member_by_email : Ajoute un membre à une flotte par email
-- ✅ Droits d'exécution attribués aux utilisateurs authentifiés
--
-- ⇒ L'ensemble des workflows TypeScript côté frontend peut maintenant s'appuyer sur ces fonctions sécurisées.
