-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : Architecture sécurisée comptes démo E-Samba
-- Objectifs  : isolation données, expiration automatique, audit, anti-abus
-- Prérequis  : migration 20260511020000 (flotte démo), pg_cron activé
-- ═══════════════════════════════════════════════════════════════════════════════

-- UUID de la flotte démo (aligné avec migration 20260511020000)
-- Ne jamais modifier sans mettre à jour les demo_profiles existants.

-- ─── 1. Table demo_profiles ────────────────────────────────────────────────
-- Source de vérité : qui est un compte démo, sur quelle flotte, avec quel rôle.

CREATE TABLE IF NOT EXISTS public.demo_profiles (
  user_id      uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  demo_role    text        NOT NULL CHECK (demo_role IN ('organizer', 'manager', 'driver', 'mechanic')),
  fleet_id     uuid        NOT NULL DEFAULT 'a1b2c3d4-0001-0001-0001-000000000001'::uuid,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        REFERENCES auth.users(id),
  expires_at   timestamptz,          -- NULL = pas d'expiration globale du compte
  last_login   timestamptz,
  notes        text
);

COMMENT ON TABLE public.demo_profiles IS
  'Comptes démo E-Samba — identifie les utilisateurs Supabase Auth restreints à la flotte démo.';

CREATE INDEX IF NOT EXISTS demo_profiles_active_idx
  ON public.demo_profiles (user_id) WHERE is_active = true;

ALTER TABLE public.demo_profiles ENABLE ROW LEVEL SECURITY;
-- Lecture par le service_role uniquement (Edge Functions, BFF admin)
-- Les utilisateurs démo ne peuvent pas lire leur propre profil démo (évite le fingerprinting)

-- ─── 2. Table demo_access_policies ────────────────────────────────────────
-- Droits par rôle démo : configurable sans redéploiement.

CREATE TABLE IF NOT EXISTS public.demo_access_policies (
  role                 text    PRIMARY KEY CHECK (role IN ('organizer', 'manager', 'driver', 'mechanic')),
  can_create_vehicles  boolean NOT NULL DEFAULT true,   -- dans la flotte démo uniquement
  can_export_data      boolean NOT NULL DEFAULT false,
  can_view_billing     boolean NOT NULL DEFAULT false,
  can_invite_users     boolean NOT NULL DEFAULT false,
  can_access_reports   boolean NOT NULL DEFAULT true,
  can_modify_org       boolean NOT NULL DEFAULT false,  -- paramètres organisation
  max_session_hours    int     NOT NULL DEFAULT 4,      -- durée max par session
  max_total_days       int     NOT NULL DEFAULT 7,      -- durée totale du compte démo
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.demo_access_policies IS
  'Matrice de droits par rôle démo — modifiable à chaud sans code.';

ALTER TABLE public.demo_access_policies ENABLE ROW LEVEL SECURITY;

-- Seed des politiques par défaut
INSERT INTO public.demo_access_policies
  (role, can_create_vehicles, can_export_data, can_view_billing, can_invite_users,
   can_access_reports, can_modify_org, max_session_hours, max_total_days)
VALUES
  ('organizer', true,  false, false, false, true,  false, 4, 7),
  ('manager',   true,  false, false, false, true,  false, 4, 7),
  ('driver',    false, false, false, false, false, false, 4, 7),
  ('mechanic',  false, false, false, false, true,  false, 4, 7)
ON CONFLICT (role) DO NOTHING;

-- ─── 3. Table demo_sessions ────────────────────────────────────────────────
-- Tracks chaque session de connexion : expiration fine, révocation immédiate.

CREATE TABLE IF NOT EXISTS public.demo_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  ip_address    text,
  user_agent    text,
  is_active     boolean     NOT NULL DEFAULT true,
  revoked_at    timestamptz,
  revoked_by    uuid        REFERENCES auth.users(id),
  revoke_reason text        CHECK (revoke_reason IN (
    'admin_revoke', 'new_session_started', 'session_expired',
    'account_expired', 'abuse_detected', 'manual_logout'
  ))
);

COMMENT ON TABLE public.demo_sessions IS
  'Sessions démo actives — expiration automatique, révocable immédiatement.';

CREATE INDEX IF NOT EXISTS demo_sessions_user_active_idx
  ON public.demo_sessions (user_id, is_active, expires_at);

CREATE INDEX IF NOT EXISTS demo_sessions_expiry_idx
  ON public.demo_sessions (expires_at) WHERE is_active = true;

ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;

-- ─── 4. Table demo_audit_logs ──────────────────────────────────────────────
-- Journal immuable de toutes les actions des comptes démo.

CREATE TABLE IF NOT EXISTS public.demo_audit_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  session_id  uuid        REFERENCES public.demo_sessions(id),
  action      text        NOT NULL,
  resource    text,
  resource_id uuid,
  status      text        NOT NULL CHECK (status IN ('allowed', 'blocked', 'expired', 'error')),
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.demo_audit_logs IS
  'Audit immuable des actions démo (lecture seule via service_role).';

CREATE INDEX IF NOT EXISTS demo_audit_user_idx
  ON public.demo_audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS demo_audit_action_idx
  ON public.demo_audit_logs (action, created_at DESC);

ALTER TABLE public.demo_audit_logs ENABLE ROW LEVEL SECURITY;
-- Jamais accessible aux utilisateurs authentifiés — service_role uniquement


-- ═══════════════════════════════════════════════════════════════════════════════
-- FONCTIONS HELPER (SECURITY DEFINER — accès interne uniquement)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── is_demo_user() ────────────────────────────────────────────────────────
-- Retourne true si l'utilisateur courant est un compte démo actif.
-- STABLE : peut être appelé plusieurs fois dans la même transaction sans coût.

CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.demo_profiles
    WHERE  user_id  = auth.uid()
    AND    is_active = true
    AND    (expires_at IS NULL OR expires_at > now())
  );
$$;

COMMENT ON FUNCTION public.is_demo_user() IS
  'Retourne true si auth.uid() est un compte démo actif. Utilisé dans les RLS restrictives.';

GRANT EXECUTE ON FUNCTION public.is_demo_user() TO authenticated;

-- ─── demo_session_valid() ──────────────────────────────────────────────────
-- Retourne true si l'utilisateur a une session démo valide (non expirée, non révoquée).

CREATE OR REPLACE FUNCTION public.demo_session_valid()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.demo_sessions
    WHERE  user_id    = auth.uid()
    AND    is_active   = true
    AND    expires_at  > now()
  );
$$;

COMMENT ON FUNCTION public.demo_session_valid() IS
  'Retourne true si la session démo courante est valide (non expirée, non révoquée).';

GRANT EXECUTE ON FUNCTION public.demo_session_valid() TO authenticated;

-- ─── demo_user_fleet_id() ──────────────────────────────────────────────────
-- Retourne l'UUID de la flotte démo autorisée pour l'utilisateur courant.

CREATE OR REPLACE FUNCTION public.demo_user_fleet_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT fleet_id
  FROM   public.demo_profiles
  WHERE  user_id   = auth.uid()
  AND    is_active  = true
  LIMIT  1;
$$;

COMMENT ON FUNCTION public.demo_user_fleet_id() IS
  'UUID de la flotte autorisée pour le compte démo courant.';

GRANT EXECUTE ON FUNCTION public.demo_user_fleet_id() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC PUBLIQUES (appelées depuis le frontend / BFF)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── demo_upsert_session() ─────────────────────────────────────────────────
-- Crée ou rafraîchit une session démo pour l'utilisateur courant.
-- Appelé au chargement de l'app si l'utilisateur est un compte démo.

CREATE OR REPLACE FUNCTION public.demo_upsert_session(
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile  demo_profiles%ROWTYPE;
  v_policy   demo_access_policies%ROWTYPE;
  v_session  demo_sessions%ROWTYPE;
  v_session_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Vérifier profil démo actif
  SELECT * INTO v_profile
  FROM demo_profiles
  WHERE user_id = auth.uid() AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_demo_user');
  END IF;

  -- Vérifier expiration du compte
  IF v_profile.expires_at IS NOT NULL AND v_profile.expires_at < now() THEN
    UPDATE demo_profiles SET is_active = false WHERE user_id = auth.uid();
    INSERT INTO demo_audit_logs (user_id, action, status, metadata)
    VALUES (auth.uid(), 'account_expired', 'expired',
      jsonb_build_object('expires_at', v_profile.expires_at));
    RETURN jsonb_build_object('ok', false, 'error', 'demo_account_expired');
  END IF;

  -- Récupérer la politique du rôle
  SELECT * INTO v_policy FROM demo_access_policies WHERE role = v_profile.demo_role;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_policy_for_role');
  END IF;

  -- Vérifier durée totale (max_total_days depuis la création du profil)
  IF v_profile.created_at + (v_policy.max_total_days || ' days')::interval < now() THEN
    UPDATE demo_profiles SET is_active = false WHERE user_id = auth.uid();
    -- Révoquer toutes les sessions actives
    UPDATE demo_sessions
    SET is_active = false, revoked_at = now(), revoke_reason = 'account_expired'
    WHERE user_id = auth.uid() AND is_active = true;
    INSERT INTO demo_audit_logs (user_id, action, status, metadata)
    VALUES (auth.uid(), 'demo_period_expired', 'expired',
      jsonb_build_object('created_at', v_profile.created_at, 'max_days', v_policy.max_total_days));
    RETURN jsonb_build_object('ok', false, 'error', 'demo_period_expired');
  END IF;

  v_expires_at := now() + (v_policy.max_session_hours || ' hours')::interval;

  -- Réutiliser la session active si elle existe et n'est pas expirée
  SELECT * INTO v_session
  FROM demo_sessions
  WHERE user_id = auth.uid() AND is_active = true AND expires_at > now()
  ORDER BY started_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Mettre à jour le heartbeat
    UPDATE demo_sessions
    SET last_seen_at = now()
    WHERE id = v_session.id;
    v_session_id := v_session.id;
    v_expires_at := v_session.expires_at;
  ELSE
    -- Expirer les anciennes sessions inactives
    UPDATE demo_sessions
    SET is_active = false, revoked_at = now(), revoke_reason = 'session_expired'
    WHERE user_id = auth.uid() AND is_active = true;

    -- Créer nouvelle session
    INSERT INTO demo_sessions (user_id, expires_at, ip_address, user_agent)
    VALUES (auth.uid(), v_expires_at, p_ip_address, p_user_agent)
    RETURNING id INTO v_session_id;

    -- Audit
    INSERT INTO demo_audit_logs (user_id, session_id, action, status, metadata)
    VALUES (auth.uid(), v_session_id, 'session_start', 'allowed',
      jsonb_build_object(
        'role',     v_profile.demo_role,
        'fleet_id', v_profile.fleet_id,
        'ip',       p_ip_address
      ));
  END IF;

  -- Mettre à jour last_login
  UPDATE demo_profiles SET last_login = now() WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'ok',          true,
    'session_id',  v_session_id,
    'expires_at',  v_expires_at,
    'fleet_id',    v_profile.fleet_id,
    'demo_role',   v_profile.demo_role,
    'policy',      to_jsonb(v_policy) - 'updated_at'
  );
END;
$$;

COMMENT ON FUNCTION public.demo_upsert_session(text, text) IS
  'Crée ou rafraîchit une session démo. Vérifie les limites de durée et la politique du rôle.';

GRANT EXECUTE ON FUNCTION public.demo_upsert_session(text, text) TO authenticated;

-- ─── demo_log_action() ─────────────────────────────────────────────────────
-- Journalise une action démo (appelé depuis le frontend ou le BFF).

CREATE OR REPLACE FUNCTION public.demo_log_action(
  p_action      text,
  p_resource    text    DEFAULT NULL,
  p_resource_id uuid    DEFAULT NULL,
  p_status      text    DEFAULT 'allowed',
  p_metadata    jsonb   DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  SELECT id INTO v_session_id
  FROM demo_sessions
  WHERE user_id = auth.uid() AND is_active = true AND expires_at > now()
  ORDER BY started_at DESC
  LIMIT 1;

  INSERT INTO demo_audit_logs (user_id, session_id, action, resource, resource_id, status, metadata)
  VALUES (auth.uid(), v_session_id, p_action, p_resource, p_resource_id, p_status, p_metadata);
END;
$$;

GRANT EXECUTE ON FUNCTION public.demo_log_action(text, text, uuid, text, jsonb) TO authenticated;

-- ─── demo_revoke_session() ─────────────────────────────────────────────────
-- Révocation immédiate d'une session démo (admin ou logout manuel).

CREATE OR REPLACE FUNCTION public.demo_revoke_session(
  p_user_id     uuid,
  p_reason      text DEFAULT 'admin_revoke'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE demo_sessions
  SET is_active    = false,
      revoked_at   = now(),
      revoked_by   = auth.uid(),
      revoke_reason = p_reason
  WHERE user_id = p_user_id AND is_active = true;

  INSERT INTO demo_audit_logs (user_id, action, status, metadata)
  VALUES (p_user_id, 'session_revoked', 'blocked',
    jsonb_build_object('revoked_by', auth.uid(), 'reason', p_reason));
END;
$$;

-- Uniquement service_role (admin) peut révoquer
GRANT EXECUTE ON FUNCTION public.demo_revoke_session(uuid, text) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS RESTRICTIVES — isolation données démo
-- RESTRICTIVE = s'applique en plus des politiques permissives existantes
-- Si is_demo_user() = false → la politique PASSE (aucune restriction pour les vrais users)
-- Si is_demo_user() = true  → seules les données de la flotte démo sont visibles
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── flottes ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS demo_isolation_flottes ON public.flottes;
CREATE POLICY demo_isolation_flottes ON public.flottes
  AS RESTRICTIVE
  USING (
    NOT is_demo_user()
    OR id = demo_user_fleet_id()
  );

-- ─── vehicules ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS demo_isolation_vehicules ON public.vehicules;
CREATE POLICY demo_isolation_vehicules ON public.vehicules
  AS RESTRICTIVE
  USING (
    NOT is_demo_user()
    OR fleet_id = demo_user_fleet_id()
  );

-- ─── organisations ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS demo_isolation_organisations ON public.organisations;
CREATE POLICY demo_isolation_organisations ON public.organisations
  AS RESTRICTIVE
  USING (
    NOT is_demo_user()
    OR id = (
      SELECT org_id FROM public.flottes WHERE id = demo_user_fleet_id()
    )
  );

-- ─── travaux_maintenance ───────────────────────────────────────────────────
DROP POLICY IF EXISTS demo_isolation_travaux ON public.travaux_maintenance;
CREATE POLICY demo_isolation_travaux ON public.travaux_maintenance
  AS RESTRICTIVE
  USING (
    NOT is_demo_user()
    OR fleet_id = demo_user_fleet_id()
  );

-- ─── abonnements — complètement bloqué pour les démos ──────────────────────
DROP POLICY IF EXISTS demo_block_abonnements ON public.abonnements;
CREATE POLICY demo_block_abonnements ON public.abonnements
  AS RESTRICTIVE
  USING (NOT is_demo_user());

-- ─── paiements — complètement bloqué ──────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paiements') THEN
    EXECUTE 'DROP POLICY IF EXISTS demo_block_paiements ON public.paiements';
    EXECUTE 'CREATE POLICY demo_block_paiements ON public.paiements AS RESTRICTIVE USING (NOT is_demo_user())';
  END IF;
END $$;

-- ─── payment_attempts — bloqué ─────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_attempts') THEN
    EXECUTE 'DROP POLICY IF EXISTS demo_block_payment_attempts ON public.payment_attempts';
    EXECUTE 'CREATE POLICY demo_block_payment_attempts ON public.payment_attempts AS RESTRICTIVE USING (NOT is_demo_user())';
  END IF;
END $$;

-- ─── billing_events — bloqué ───────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_events') THEN
    EXECUTE 'DROP POLICY IF EXISTS demo_block_billing_events ON public.billing_events';
    EXECUTE 'CREATE POLICY demo_block_billing_events ON public.billing_events AS RESTRICTIVE USING (NOT is_demo_user())';
  END IF;
END $$;

-- ─── conducteurs — isolation flotte démo ───────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conducteurs') THEN
    EXECUTE 'DROP POLICY IF EXISTS demo_isolation_conducteurs ON public.conducteurs';
    EXECUTE 'CREATE POLICY demo_isolation_conducteurs ON public.conducteurs AS RESTRICTIVE USING (NOT is_demo_user() OR fleet_id = demo_user_fleet_id())';
  END IF;
END $$;

-- ─── notification_queue — bloqué ───────────────────────────────────────────
DROP POLICY IF EXISTS demo_block_notification_queue ON public.notification_queue;
CREATE POLICY demo_block_notification_queue ON public.notification_queue
  AS RESTRICTIVE
  USING (NOT is_demo_user());

-- ─── demo_profiles — demo users ne peuvent pas se voir ────────────────────
CREATE POLICY demo_profiles_no_self_read ON public.demo_profiles
  FOR SELECT USING (false);  -- service_role contourne RLS, authenticated ne voit rien

-- ─── demo_sessions — demo users peuvent lire leur propre session ───────────
DROP POLICY IF EXISTS demo_sessions_own_read ON public.demo_sessions;
CREATE POLICY demo_sessions_own_read ON public.demo_sessions
  FOR SELECT USING (user_id = auth.uid());

-- ─── demo_audit_logs — inaccessible aux authenticated ─────────────────────
-- Aucune policy SELECT → accès refusé pour tous sauf service_role
-- (service_role bypasse RLS par défaut dans Supabase)


-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC GUARD — interdictions supplémentaires au niveau SQL
-- ═══════════════════════════════════════════════════════════════════════════════

-- Guard can_create_vehicle prend en compte les limites démo
-- (on wrappe la fonction existante si présente)
CREATE OR REPLACE FUNCTION public.demo_check_allowed(p_action text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_policy demo_access_policies%ROWTYPE;
  v_role   text;
BEGIN
  IF NOT is_demo_user() THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  SELECT demo_role INTO v_role
  FROM demo_profiles WHERE user_id = auth.uid() AND is_active = true;

  SELECT * INTO v_policy FROM demo_access_policies WHERE role = v_role;

  CASE p_action
    WHEN 'create_vehicle'  THEN RETURN jsonb_build_object('allowed', v_policy.can_create_vehicles, 'reason', 'demo_policy');
    WHEN 'export_data'     THEN RETURN jsonb_build_object('allowed', v_policy.can_export_data,     'reason', 'demo_policy');
    WHEN 'view_billing'    THEN RETURN jsonb_build_object('allowed', v_policy.can_view_billing,    'reason', 'demo_policy');
    WHEN 'invite_users'    THEN RETURN jsonb_build_object('allowed', v_policy.can_invite_users,    'reason', 'demo_policy');
    WHEN 'access_reports'  THEN RETURN jsonb_build_object('allowed', v_policy.can_access_reports,  'reason', 'demo_policy');
    WHEN 'modify_org'      THEN RETURN jsonb_build_object('allowed', v_policy.can_modify_org,      'reason', 'demo_policy');
    ELSE RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_action');
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.demo_check_allowed(text) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- VUE ADMIN monitoring démo
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_demo_accounts_status AS
SELECT
  u.email,
  dp.demo_role,
  dp.is_active,
  dp.created_at      AS account_created,
  dp.expires_at      AS account_expires,
  dp.last_login,
  (
    SELECT count(*) FROM demo_sessions ds
    WHERE ds.user_id = dp.user_id
  ) AS total_sessions,
  (
    SELECT max(ds.last_seen_at) FROM demo_sessions ds
    WHERE ds.user_id = dp.user_id AND ds.is_active = true
  ) AS last_seen,
  (
    SELECT count(*) FROM demo_audit_logs dal
    WHERE dal.user_id = dp.user_id AND dal.status = 'blocked'
  ) AS blocked_attempts
FROM public.demo_profiles dp
JOIN auth.users u ON u.id = dp.user_id
ORDER BY dp.created_at DESC;

COMMENT ON VIEW public.v_demo_accounts_status IS
  'Monitoring admin des comptes démo : activité, sessions, tentatives bloquées.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- pg_cron : nettoyage automatique des sessions expirées (02h30 UTC)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  job_exists boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    AND to_regnamespace('cron') IS NOT NULL
    AND to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)'
      INTO job_exists
      USING 'demo-session-cleanup';

    IF job_exists THEN
      EXECUTE 'SELECT cron.unschedule($1)'
        USING 'demo-session-cleanup';
    END IF;

    EXECUTE 'SELECT cron.schedule($1, $2, $3)'
      USING
      'demo-session-cleanup',
      '30 2 * * *',
      $cron$
        -- Expirer les sessions démo dépassées
        UPDATE public.demo_sessions
        SET is_active    = false,
            revoked_at   = now(),
            revoke_reason = 'session_expired'
        WHERE is_active = true AND expires_at < now();

        -- Désactiver les comptes démo dont la durée totale est dépassée
        UPDATE public.demo_profiles dp
        SET is_active = false
        FROM public.demo_access_policies dap
        WHERE dap.role = dp.demo_role
        AND dp.is_active = true
        AND dp.expires_at IS NOT NULL
        AND dp.expires_at < now();

        -- Révoquer les sessions des comptes désactivés
        UPDATE public.demo_sessions ds
        SET is_active    = false,
            revoked_at   = now(),
            revoke_reason = 'account_expired'
        WHERE ds.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM public.demo_profiles dp
          WHERE dp.user_id = ds.user_id AND dp.is_active = true
        );
      $cron$;

    RAISE NOTICE 'pg_cron job demo-session-cleanup enregistré (02:30 UTC).';
  ELSE
    RAISE NOTICE 'pg_cron non disponible — nettoyer manuellement ou via Edge Function.';
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- GRANTS service_role (Edge Functions, BFF admin)
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON public.demo_profiles       TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.demo_sessions       TO service_role;
GRANT SELECT                  ON public.demo_access_policies TO service_role;
GRANT SELECT, INSERT          ON public.demo_audit_logs     TO service_role;
GRANT SELECT                  ON public.v_demo_accounts_status TO service_role;
