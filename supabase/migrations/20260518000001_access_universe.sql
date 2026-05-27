-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 20260518000001 — Univers d'accès E-Samba
--
-- Principe : trois univers strictement isolés
--   internal   = équipe interne (admin, dev, commercial)
--   temporary  = comptes temporaires (prospects, investisseurs)
--   real       = comptes clients réels (chauffeurs, gestionnaires, etc.)
--
-- Un compte d'un univers ne voit JAMAIS les données d'un autre univers.
-- Les politiques RLS renforcent cette règle au niveau base de données.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. Type ENUM access_universe ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.access_universe AS ENUM ('internal', 'temporary', 'real');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.access_universe IS
  'Univers d''accès E-Samba — internal (équipe), temporary (prospects/investisseurs), real (clients).';


-- ─── 2. Colonne universe sur demo_profiles ────────────────────────────────────
-- demo_profiles couvre les univers internal et temporary.
-- Les comptes real sont dans flotte_adhesions (pas de profil démo).

ALTER TABLE public.demo_profiles
  ADD COLUMN IF NOT EXISTS universe public.access_universe
    GENERATED ALWAYS AS (
      CASE account_type
        WHEN 'internal'  THEN 'internal'::public.access_universe
        WHEN 'permanent' THEN 'internal'::public.access_universe   -- comptes démo permanents = équipe
        WHEN 'prospect'  THEN 'temporary'::public.access_universe
        WHEN 'investor'  THEN 'temporary'::public.access_universe
        ELSE                  'temporary'::public.access_universe
      END
    ) STORED;

COMMENT ON COLUMN public.demo_profiles.universe IS
  'Univers calculé depuis account_type — internal ou temporary. Jamais real (profils séparés).';


-- ─── 3. Enrichissement account_type — ajout investor ─────────────────────────

ALTER TABLE public.demo_profiles
  DROP CONSTRAINT IF EXISTS demo_profiles_account_type_check;

ALTER TABLE public.demo_profiles
  ADD CONSTRAINT demo_profiles_account_type_check
    CHECK (account_type IN ('permanent', 'prospect', 'internal', 'investor'));

COMMENT ON COLUMN public.demo_profiles.account_type IS
  'permanent = démo commercial, prospect = essai 7j, internal = équipe interne, investor = investisseur lecture seule';


-- ─── 4. internal_role sur admin_profiles ──────────────────────────────────────
-- Distingue les rôles internes : admin (tout), dev (technique), commercial (démo/prospect).

ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS internal_role text NOT NULL DEFAULT 'admin'
    CHECK (internal_role IN ('admin', 'dev', 'commercial'));

COMMENT ON COLUMN public.admin_profiles.internal_role IS
  'admin = accès total plateforme, dev = accès technique, commercial = création démo/prospect uniquement';

-- Index pour requêtes par rôle interne
CREATE INDEX IF NOT EXISTS idx_admin_profiles_internal_role
  ON public.admin_profiles (internal_role) WHERE is_active = true;


-- ─── 5. Colonne universe sur flotte_adhesions (comptes real) ──────────────────
-- Les membres réels n'ont pas de demo_profile — leur univers est toujours 'real'.

ALTER TABLE public.flotte_adhesions
  ADD COLUMN IF NOT EXISTS universe public.access_universe NOT NULL DEFAULT 'real';

COMMENT ON COLUMN public.flotte_adhesions.universe IS
  'Toujours real pour les membres d''une flotte réelle. Mis à jour automatiquement.';

-- Garantir que toutes les adhésions existantes sont bien 'real'
UPDATE public.flotte_adhesions SET universe = 'real' WHERE universe IS DISTINCT FROM 'real';


-- ─── 6. Fonction helper : get_user_universe ────────────────────────────────────
-- Retourne l'univers d'un utilisateur — utilisé par les policies RLS.

CREATE OR REPLACE FUNCTION public.get_user_universe(p_user_id uuid DEFAULT auth.uid())
RETURNS public.access_universe
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Vérifier d'abord si c'est un compte interne (admin/dev/commercial)
    CASE WHEN EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = p_user_id AND is_active = true
    ) THEN 'internal'::public.access_universe END,

    -- Ensuite vérifier demo_profiles (prospect ou investor)
    (SELECT universe FROM public.demo_profiles WHERE user_id = p_user_id AND is_active = true),

    -- Sinon c'est un compte réel (membre d'une flotte)
    CASE WHEN EXISTS (
      SELECT 1 FROM public.flotte_adhesions
      WHERE user_id = p_user_id AND statut = 'actif'
    ) THEN 'real'::public.access_universe END,

    -- Fallback : inconnu traité comme real (le plus restrictif)
    'real'::public.access_universe
  );
$$;

COMMENT ON FUNCTION public.get_user_universe(uuid) IS
  'Retourne l''univers d''accès d''un utilisateur : internal | temporary | real.';

GRANT EXECUTE ON FUNCTION public.get_user_universe(uuid) TO authenticated, service_role;


-- ─── 7. Fonction helper : is_internal_user ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_internal_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = p_user_id AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_internal_user(uuid) TO authenticated, service_role;


-- ─── 8. Fonction helper : is_temporary_user ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_temporary_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.demo_profiles
    WHERE user_id = p_user_id
      AND is_active = true
      AND account_type IN ('prospect', 'investor')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_temporary_user(uuid) TO authenticated, service_role;


-- ─── 9. Fonction helper : is_real_user ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_real_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT public.is_internal_user(p_user_id)
     AND NOT public.is_temporary_user(p_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_real_user(uuid) TO authenticated, service_role;


-- ─── 10. Fonction helper : can_access_commercial ──────────────────────────────
-- Un commercial peut créer des accès démo/prospect — jamais admin.

CREATE OR REPLACE FUNCTION public.can_create_demo_access(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = p_user_id
      AND is_active = true
      AND internal_role IN ('admin', 'commercial')
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_create_demo_access(uuid) TO authenticated, service_role;


-- ─── 11. RLS isolation univers sur flottes ─────────────────────────────────────
-- Un compte real ne voit jamais les flottes is_demo=true.
-- Un compte temporary ne voit que les flottes is_demo=true.
-- Un compte internal voit tout.

-- Politique flottes réelles → comptes real uniquement
DROP POLICY IF EXISTS flottes_real_universe_isolation ON public.flottes;
CREATE POLICY flottes_real_universe_isolation ON public.flottes
  FOR SELECT
  USING (
    CASE
      -- Interne : voit tout
      WHEN public.is_internal_user() THEN true
      -- Temporaire : voit uniquement les flottes démo
      WHEN public.is_temporary_user() THEN is_demo = true
      -- Réel : voit uniquement les flottes non-démo sur lesquelles il est membre
      ELSE is_demo = false
        AND EXISTS (
          SELECT 1 FROM public.flotte_adhesions fa
          WHERE fa.fleet_id = flottes.id
            AND fa.user_id = auth.uid()
            AND fa.statut = 'actif'
        )
    END
  );


-- ─── 12. RLS isolation univers sur demo_profiles ──────────────────────────────
-- Un compte real ne peut jamais accéder aux demo_profiles.

DROP POLICY IF EXISTS demo_profiles_universe_isolation ON public.demo_profiles;
CREATE POLICY demo_profiles_universe_isolation ON public.demo_profiles
  FOR SELECT
  USING (
    -- Seul le service_role et les admins internes peuvent lire les demo_profiles
    public.is_internal_user()
  );


-- ─── 13. RLS : compte investisseur — lecture seule stricte ────────────────────
-- Les investisseurs ne peuvent écrire nulle part dans les tables métier.
-- Implémenté via helper appelé dans les policies INSERT/UPDATE/DELETE existantes.

CREATE OR REPLACE FUNCTION public.is_investor(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.demo_profiles
    WHERE user_id = p_user_id
      AND is_active = true
      AND account_type = 'investor'
  );
$$;

COMMENT ON FUNCTION public.is_investor(uuid) IS
  'Retourne true si l''utilisateur est un investisseur (lecture seule sur données démo).';

GRANT EXECUTE ON FUNCTION public.is_investor(uuid) TO authenticated, service_role;


-- ─── 14. Vue v_user_universe — debug / admin ──────────────────────────────────

CREATE OR REPLACE VIEW public.v_user_universe AS
SELECT
  u.id                                          AS user_id,
  u.email,
  public.get_user_universe(u.id)                AS universe,
  ap.internal_role,
  dp.account_type,
  dp.demo_role,
  dp.is_active                                  AS demo_active,
  dp.expires_at                                 AS demo_expires_at
FROM auth.users u
LEFT JOIN public.admin_profiles ap ON ap.user_id = u.id
LEFT JOIN public.demo_profiles   dp ON dp.user_id = u.id;

COMMENT ON VIEW public.v_user_universe IS
  'Vue admin — univers et rôle de chaque utilisateur. Accessible service_role uniquement.';

REVOKE ALL ON public.v_user_universe FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_user_universe TO service_role;


-- ─── 15. Audit log — enrichissement univers ───────────────────────────────────

ALTER TABLE public.demo_audit_logs
  ADD COLUMN IF NOT EXISTS universe public.access_universe;

-- Backfill depuis demo_profiles
UPDATE public.demo_audit_logs dal
   SET universe = dp.universe
  FROM public.demo_profiles dp
 WHERE dp.user_id = dal.user_id
   AND dal.universe IS NULL;
