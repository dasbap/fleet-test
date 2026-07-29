-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : RBAC complet E-Samba
-- Rôles : organizer | manager | driver | mechanic | admin (platform-level)
--
-- Principes :
--   - Admin = rôle plateforme global, jamais accessible aux comptes démo
--   - Organizer = gère N flottes (via flotte_adhesions, multi-fleet)
--   - Manager = gère 1 flotte (via flotte_adhesions, mono-fleet enforced applicativement)
--   - Driver = accès limité à son espace + contrainte 1 seul véhicule actif
--   - Mechanic = accès maintenance + tous véhicules de sa flotte
--   - Cross-fleet : bloqué par RLS + helpers
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Table admin_profiles ──────────────────────────────────────────────────
-- Rôle plateforme global — séparé de flotte_adhesions (cross-fleet par nature).

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id     uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES auth.users(id),
  notes       text
);

COMMENT ON TABLE public.admin_profiles IS
  'Administrateurs plateforme E-Samba — accès global, jamais accessible depuis un compte démo.';

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Les admins ne peuvent pas se voir entre eux via le client (service_role uniquement)
DROP POLICY IF EXISTS admin_profiles_no_select ON public.admin_profiles;
CREATE POLICY admin_profiles_no_select ON public.admin_profiles
  FOR SELECT USING (false);

GRANT SELECT, INSERT, UPDATE ON public.admin_profiles TO service_role;


-- ─── 2. Contrainte driver — 1 seul véhicule actif simultanément ───────────────
-- Si la table d'affectations existe (selon schéma du projet).

DO $$
BEGIN
  -- Table affectations conducteurs
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('affectations', 'driver_assignments', 'vehicle_assignments')
  ) THEN
    -- Index unique partiel : un conducteur ne peut avoir qu'une affectation active
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS driver_single_active_assignment
      ON public.affectations (driver_id)
      WHERE status = ''active'' OR ended_at IS NULL';
    RAISE NOTICE 'Contrainte driver single assignment appliquée.';
  ELSE
    RAISE NOTICE 'Table affectations non trouvée — contrainte driver à appliquer manuellement.';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- FONCTIONS HELPER RBAC (SECURITY DEFINER, STABLE)
-- Nommage : `rbac_` prefix pour éviter les collisions
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── is_platform_admin() ──────────────────────────────────────────────────────
-- Admin plateforme + JAMAIS depuis un compte démo (double garde).

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    -- Ne peut pas être admin si compte démo
    NOT is_demo_user()
    AND EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid() AND is_active = true
    );
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS
  'Vrai si l''utilisateur est admin plateforme ET non-démo. Double garde.';

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- ─── rbac_role_on_fleet(fleet_id) ─────────────────────────────────────────────
-- Retourne le rôle de l'utilisateur courant sur une flotte spécifique.
-- NULL si pas de membership actif.

CREATE OR REPLACE FUNCTION public.rbac_role_on_fleet(p_fleet_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::text
  FROM   public.flotte_adhesions
  WHERE  user_id  = auth.uid()
  AND    fleet_id = p_fleet_id
  AND    is_active = true
  LIMIT  1;
$$;

COMMENT ON FUNCTION public.rbac_role_on_fleet(uuid) IS
  'Rôle de auth.uid() sur une flotte donnée. NULL si aucun membership actif.';

GRANT EXECUTE ON FUNCTION public.rbac_role_on_fleet(uuid) TO authenticated;

-- ─── rbac_has_fleet_access(fleet_id) ──────────────────────────────────────────
-- L'utilisateur a-t-il accès à cette flotte (n'importe quel rôle actif ou admin) ?

CREATE OR REPLACE FUNCTION public.rbac_has_fleet_access(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.flotte_adhesions
      WHERE user_id  = auth.uid()
      AND   fleet_id = p_fleet_id
      AND   is_active = true
    );
$$;

COMMENT ON FUNCTION public.rbac_has_fleet_access(uuid) IS
  'Vrai si l''utilisateur a un membership actif sur la flotte OU est admin plateforme.';

GRANT EXECUTE ON FUNCTION public.rbac_has_fleet_access(uuid) TO authenticated;

-- ─── rbac_is_fleet_manager_or_above(fleet_id) ────────────────────────────────
-- L'utilisateur est-il manager, organizer, ou admin sur cette flotte ?

CREATE OR REPLACE FUNCTION public.rbac_is_fleet_manager_or_above(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.flotte_adhesions
      WHERE user_id  = auth.uid()
      AND   fleet_id = p_fleet_id
      AND   is_active = true
      AND   role::text IN ('organizer', 'manager')
    );
$$;

COMMENT ON FUNCTION public.rbac_is_fleet_manager_or_above(uuid) IS
  'Vrai si l''utilisateur est organizer/manager sur la flotte OU admin plateforme.';

GRANT EXECUTE ON FUNCTION public.rbac_is_fleet_manager_or_above(uuid) TO authenticated;

-- ─── rbac_is_fleet_organizer(fleet_id) ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rbac_is_fleet_organizer(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.flotte_adhesions
      WHERE user_id  = auth.uid()
      AND   fleet_id = p_fleet_id
      AND   is_active = true
      AND   role::text = 'organizer'
    );
$$;

GRANT EXECUTE ON FUNCTION public.rbac_is_fleet_organizer(uuid) TO authenticated;

-- ─── rbac_is_mechanic_on_fleet(fleet_id) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rbac_is_mechanic_on_fleet(p_fleet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.flotte_adhesions
      WHERE user_id  = auth.uid()
      AND   fleet_id = p_fleet_id
      AND   is_active = true
      AND   role::text IN ('organizer', 'manager', 'mechanic')
    );
$$;

GRANT EXECUTE ON FUNCTION public.rbac_is_mechanic_on_fleet(uuid) TO authenticated;

-- ─── rbac_user_fleet_ids() ────────────────────────────────────────────────────
-- Retourne tous les fleet_ids accessibles par l'utilisateur courant.
-- Utilisé pour les requêtes multi-flottes (organizer).

CREATE OR REPLACE FUNCTION public.rbac_user_fleet_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT fleet_id
    FROM   public.flotte_adhesions
    WHERE  user_id  = auth.uid()
    AND    is_active = true
  );
$$;

COMMENT ON FUNCTION public.rbac_user_fleet_ids() IS
  'Array des fleet_ids accessibles par l''utilisateur courant (tous ses memberships actifs).';

GRANT EXECUTE ON FUNCTION public.rbac_user_fleet_ids() TO authenticated;

-- ─── rbac_check_permission(action, fleet_id) ─────────────────────────────────
-- Vérification unifiée d'une permission côté SQL (appelable depuis frontend/BFF).

CREATE OR REPLACE FUNCTION public.rbac_check_permission(
  p_action   text,
  p_fleet_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role    text;
  v_allowed boolean := false;
BEGIN
  -- Admin : tout est autorisé (sauf depuis démo — géré par is_platform_admin)
  IF is_platform_admin() THEN
    RETURN jsonb_build_object('allowed', true, 'role', 'admin', 'reason', 'platform_admin');
  END IF;

  -- Récupérer le rôle sur la flotte ciblée
  IF p_fleet_id IS NOT NULL THEN
    v_role := rbac_role_on_fleet(p_fleet_id);
  ELSE
    -- Sans fleet_id : prendre le rôle le plus élevé de l'utilisateur
    SELECT role::text INTO v_role
    FROM public.flotte_adhesions
    WHERE user_id = auth.uid() AND is_active = true
    ORDER BY CASE role::text
      WHEN 'organizer' THEN 1
      WHEN 'manager'   THEN 2
      WHEN 'mechanic'  THEN 3
      WHEN 'driver'    THEN 4
      ELSE 5
    END
    LIMIT 1;
  END IF;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'role', null, 'reason', 'no_fleet_access');
  END IF;

  -- Matrice de permissions
  v_allowed := CASE
    -- fleet.*
    WHEN p_action = 'fleet.view'           THEN v_role IN ('organizer','manager','driver','mechanic')
    WHEN p_action = 'fleet.create'         THEN v_role = 'organizer'
    WHEN p_action = 'fleet.update'         THEN v_role IN ('organizer','manager')
    WHEN p_action = 'fleet.delete'         THEN v_role = 'organizer'

    -- vehicle.*
    WHEN p_action = 'vehicle.view'         THEN v_role IN ('organizer','manager','driver','mechanic')
    WHEN p_action = 'vehicle.create'       THEN v_role IN ('organizer','manager')
    WHEN p_action = 'vehicle.update'       THEN v_role IN ('organizer','manager','mechanic')
    WHEN p_action = 'vehicle.delete'       THEN v_role IN ('organizer','manager')
    WHEN p_action = 'vehicle.assign_driver' THEN v_role IN ('organizer','manager')

    -- member.*
    WHEN p_action = 'member.view'          THEN v_role IN ('organizer','manager','mechanic','driver')
    WHEN p_action = 'member.invite'        THEN v_role IN ('organizer','manager')
    WHEN p_action = 'member.remove'        THEN v_role = 'organizer'
    WHEN p_action = 'member.update_role'   THEN v_role = 'organizer'

    -- maintenance.*
    WHEN p_action = 'maintenance.view'     THEN v_role IN ('organizer','manager','mechanic')
    WHEN p_action = 'maintenance.create'   THEN v_role IN ('organizer','manager','mechanic')
    WHEN p_action = 'maintenance.update'   THEN v_role IN ('organizer','manager','mechanic')
    WHEN p_action = 'maintenance.delete'   THEN v_role IN ('organizer','manager')

    -- assignment.*
    WHEN p_action = 'assignment.view_own'  THEN v_role IN ('organizer','manager','driver','mechanic')
    WHEN p_action = 'assignment.view_all'  THEN v_role IN ('organizer','manager')
    WHEN p_action = 'assignment.manage'    THEN v_role IN ('organizer','manager')

    -- report.*
    WHEN p_action = 'report.view'          THEN v_role IN ('organizer','manager','mechanic')
    WHEN p_action = 'report.export'        THEN v_role IN ('organizer','manager')

    -- billing.*
    WHEN p_action = 'billing.view'         THEN v_role = 'organizer'
    WHEN p_action = 'billing.manage'       THEN v_role = 'organizer'

    -- dvir.*
    WHEN p_action = 'dvir.submit'          THEN v_role IN ('organizer','manager','driver','mechanic')
    WHEN p_action = 'dvir.view_all'        THEN v_role IN ('organizer','manager','mechanic')

    -- org.*
    WHEN p_action = 'org.settings'         THEN v_role IN ('organizer','manager')
    WHEN p_action = 'org.manage'           THEN v_role = 'organizer'

    -- admin.*
    WHEN p_action = 'admin.access'         THEN false   -- jamais via ce path (is_platform_admin nécessaire)
    ELSE false
  END;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'role',    v_role,
    'reason',  CASE WHEN v_allowed THEN 'role_allowed' ELSE 'role_denied' END
  );
END;
$$;

COMMENT ON FUNCTION public.rbac_check_permission(text, uuid) IS
  'Vérification unifiée d''une permission RBAC. Retourne {allowed, role, reason}.';

GRANT EXECUTE ON FUNCTION public.rbac_check_permission(text, uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS RESTRICTIVES — renforcement RBAC sur tables critiques
-- Pattern : RESTRICTIVE = s'ajoute aux permissives existantes (AND logique)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── flotte_adhesions : seuls les managers/organizers gèrent les membres ───────
-- Driver et mechanic ne peuvent pas voir les autres memberships
-- (ils voient uniquement le leur via la policy existante)

DROP POLICY IF EXISTS rbac_adhesions_role_read ON public.flotte_adhesions;
CREATE POLICY rbac_adhesions_role_read ON public.flotte_adhesions
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_platform_admin()
    -- Peut voir sa propre adhésion
    OR user_id = auth.uid()
    -- Organizer/Manager voient tous les membres de leurs flottes
    OR rbac_is_fleet_manager_or_above(fleet_id)
  );

DROP POLICY IF EXISTS rbac_adhesions_insert ON public.flotte_adhesions;
CREATE POLICY rbac_adhesions_insert ON public.flotte_adhesions
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR rbac_is_fleet_organizer(fleet_id)
  );

DROP POLICY IF EXISTS rbac_adhesions_update ON public.flotte_adhesions;
CREATE POLICY rbac_adhesions_update ON public.flotte_adhesions
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_platform_admin()
    -- Organizer peut modifier les rôles ; manager peut activer/désactiver seulement
    OR rbac_is_fleet_organizer(fleet_id)
    OR (rbac_is_fleet_manager_or_above(fleet_id) AND role::text NOT IN ('organizer'))
  );

DROP POLICY IF EXISTS rbac_adhesions_delete ON public.flotte_adhesions;
CREATE POLICY rbac_adhesions_delete ON public.flotte_adhesions
  AS RESTRICTIVE
  FOR DELETE
  USING (
    is_platform_admin()
    OR rbac_is_fleet_organizer(fleet_id)
  );

-- ─── vehicules : mechanic peut UPDATE (maintenance), driver READ seul ──────────

DROP POLICY IF EXISTS rbac_vehicules_write ON public.vehicules;
CREATE POLICY rbac_vehicules_write ON public.vehicules
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR rbac_is_fleet_manager_or_above(fleet_id)
  );

DROP POLICY IF EXISTS rbac_vehicules_update ON public.vehicules;
CREATE POLICY rbac_vehicules_update ON public.vehicules
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_platform_admin()
    -- Manager/Organizer : mise à jour complète
    OR rbac_is_fleet_manager_or_above(fleet_id)
    -- Mechanic : mise à jour statut/maintenance
    OR rbac_is_mechanic_on_fleet(fleet_id)
    -- (driver : accès READ uniquement — ne peut pas UPDATE via RLS)
  );

DROP POLICY IF EXISTS rbac_vehicules_delete ON public.vehicules;
CREATE POLICY rbac_vehicules_delete ON public.vehicules
  AS RESTRICTIVE
  FOR DELETE
  USING (
    is_platform_admin()
    OR rbac_is_fleet_manager_or_above(fleet_id)
  );

-- ─── travaux_maintenance : mechanic gère, driver exclut ───────────────────────

DROP POLICY IF EXISTS rbac_travaux_read ON public.travaux_maintenance;
CREATE POLICY rbac_travaux_read ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_platform_admin()
    OR rbac_is_mechanic_on_fleet(fleet_id)
    -- Driver ne voit pas la maintenance (rôle "terrain" uniquement)
  );

DROP POLICY IF EXISTS rbac_travaux_write ON public.travaux_maintenance;
CREATE POLICY rbac_travaux_write ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR rbac_is_mechanic_on_fleet(fleet_id)
  );

DROP POLICY IF EXISTS rbac_travaux_update ON public.travaux_maintenance;
CREATE POLICY rbac_travaux_update ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_platform_admin()
    OR rbac_is_mechanic_on_fleet(fleet_id)
  );

DROP POLICY IF EXISTS rbac_travaux_delete ON public.travaux_maintenance;
CREATE POLICY rbac_travaux_delete ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR DELETE
  USING (
    is_platform_admin()
    OR rbac_is_fleet_manager_or_above(fleet_id)
    -- Mechanic ne peut pas supprimer les travaux (éditer seulement)
  );

-- ─── flottes : organizer crée/supprime, manager met à jour ────────────────────

DROP POLICY IF EXISTS rbac_flottes_insert ON public.flottes;
CREATE POLICY rbac_flottes_insert ON public.flottes
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    -- La création de flotte passe par RPC (pas de restriction RLS directe ici)
    OR true
  );

DROP POLICY IF EXISTS rbac_flottes_update ON public.flottes;
CREATE POLICY rbac_flottes_update ON public.flottes
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_platform_admin()
    OR rbac_is_fleet_manager_or_above(id)
  );

DROP POLICY IF EXISTS rbac_flottes_delete ON public.flottes;
CREATE POLICY rbac_flottes_delete ON public.flottes
  AS RESTRICTIVE
  FOR DELETE
  USING (
    is_platform_admin()
    OR rbac_is_fleet_organizer(id)
  );

-- ─── abonnements / billing : organizer seulement (+ protection démo déjà en place) ─

DROP POLICY IF EXISTS rbac_abonnements_read ON public.abonnements;
CREATE POLICY rbac_abonnements_read ON public.abonnements
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_platform_admin()
    OR rbac_is_fleet_organizer(fleet_id)
    -- manager/driver/mechanic ne voient pas la facturation
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- VUE ADMIN : matrice d'accès par utilisateur
-- ═══════════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.v_rbac_user_roles;
CREATE VIEW public.v_rbac_user_roles AS
SELECT
  u.id          AS user_id,
  u.email,
  fa.fleet_id,
  f.name        AS fleet_name,
  fa.role::text AS fleet_role,
  fa.is_active,
  ap.is_active  AS is_platform_admin,
  dp.is_active  AS is_demo_user,
  dp.demo_role
FROM auth.users u
LEFT JOIN public.flotte_adhesions fa   ON fa.user_id = u.id AND fa.is_active = true
LEFT JOIN public.flottes f             ON f.id = fa.fleet_id
LEFT JOIN public.admin_profiles ap     ON ap.user_id = u.id AND ap.is_active = true
LEFT JOIN public.demo_profiles dp      ON dp.user_id = u.id AND dp.is_active = true
ORDER BY u.email, f.name;

COMMENT ON VIEW public.v_rbac_user_roles IS
  'Vue admin : rôles RBAC complets par utilisateur (flotte + admin + démo).';

GRANT SELECT ON public.v_rbac_user_roles TO service_role;
