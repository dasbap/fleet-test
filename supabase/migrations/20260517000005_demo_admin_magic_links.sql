-- ============================================================================
-- Migration : demo_magic_links + onboarding_logs + admin RPC
--
-- Tables :
--   demo_magic_links      : tokens UUID d'accès prospect (magic link commercial)
--   demo_onboarding_logs  : suivi des étapes d'onboarding prospect
--
-- Fonctions :
--   demo_validate_magic_link(token)    → valide + incrémente used_count
--   demo_create_magic_link(...)        → crée un lien, désactive les anciens
--   admin_list_demo_sessions(active)   → vue enrichie pour l'admin UI
--   admin_reset_demo_fleet(fleet_id)   → réinitialise les données de démo
--
-- Enrichissement demo_profiles :
--   ADD COLUMN email text (backfill depuis auth.users)
--   ADD COLUMN last_login timestamptz
--   ADD COLUMN last_activity_at timestamptz
-- ============================================================================

-- ─── 1. Enrichissement demo_profiles ─────────────────────────────────────────

ALTER TABLE demo_profiles
  ADD COLUMN IF NOT EXISTS email          text,
  ADD COLUMN IF NOT EXISTS last_login     timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT NULL;

-- Backfill email depuis auth.users (source de vérité)
UPDATE demo_profiles dp
   SET email = u.email
  FROM auth.users u
 WHERE u.id = dp.user_id
   AND dp.email IS NULL;

-- ─── 2. Table demo_magic_links ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS demo_magic_links (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token          uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fleet_id       uuid REFERENCES flottes(id) ON DELETE SET NULL,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email          text NOT NULL,
  label          text,                          -- étiquette commerciale (ex: "Salon transport 2026")
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_count     int NOT NULL DEFAULT 0,
  last_used_at   timestamptz,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_magic_links_token
  ON demo_magic_links (token)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_demo_magic_links_user
  ON demo_magic_links (user_id, is_active);

-- RLS : service_role uniquement (admin UI via BFF)
ALTER TABLE demo_magic_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_magic_links_no_public ON demo_magic_links;
CREATE POLICY demo_magic_links_no_public
  ON demo_magic_links
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false);

COMMENT ON TABLE demo_magic_links IS
  'Tokens UUID pour les magic links commerciaux démo. Validés par Edge Function.';

-- ─── 3. Table demo_onboarding_logs ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS demo_onboarding_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  magic_link_id  uuid REFERENCES demo_magic_links(id) ON DELETE SET NULL,
  step           int NOT NULL,             -- numéro d'étape (1, 2, 3…)
  metadata       jsonb DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_onboarding_logs_user
  ON demo_onboarding_logs (user_id, created_at DESC);

-- RLS : utilisateur voit uniquement ses propres logs (write + admin service_role)
ALTER TABLE demo_onboarding_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_onboarding_logs_own_write ON demo_onboarding_logs;
CREATE POLICY demo_onboarding_logs_own_write
  ON demo_onboarding_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS demo_onboarding_logs_own_read ON demo_onboarding_logs;
CREATE POLICY demo_onboarding_logs_own_read
  ON demo_onboarding_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE demo_onboarding_logs IS
  'Suivi des étapes d''onboarding prospect. Écrit par le client post-auth.';

-- ─── 4. demo_validate_magic_link() ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION demo_validate_magic_link(p_token uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_link record;
BEGIN
  SELECT id, user_id, fleet_id, email, expires_at, is_active, used_count
    INTO v_link
    FROM demo_magic_links
   WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_not_found');
  END IF;

  IF NOT v_link.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_revoked');
  END IF;

  IF v_link.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_expired');
  END IF;

  -- Vérifier que le compte démo est encore actif
  IF NOT EXISTS (
    SELECT 1 FROM demo_profiles
     WHERE user_id = v_link.user_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'account_inactive');
  END IF;

  -- Incrémenter l'usage
  UPDATE demo_magic_links
     SET used_count   = used_count + 1,
         last_used_at = now()
   WHERE id = v_link.id;

  -- Mettre à jour last_activity_at sur demo_profiles
  UPDATE demo_profiles
     SET last_activity_at = now()
   WHERE user_id = v_link.user_id;

  RETURN jsonb_build_object(
    'ok',       true,
    'user_id',  v_link.user_id,
    'email',    v_link.email,
    'fleet_id', v_link.fleet_id
  );
END;
$$;

COMMENT ON FUNCTION demo_validate_magic_link(uuid) IS
  'Valide un magic link token, incrémente used_count. SECURITY DEFINER.';

-- ─── 5. demo_create_magic_link() ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION demo_create_magic_link(
  p_user_id   uuid,
  p_fleet_id  uuid,
  p_email     text,
  p_label     text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_token     uuid;
  v_link_id   uuid;
  v_expires   timestamptz;
BEGIN
  -- Désactiver les anciens liens actifs pour ce user
  UPDATE demo_magic_links
     SET is_active = false
   WHERE user_id = p_user_id AND is_active = true;

  v_token   := gen_random_uuid();
  v_expires := COALESCE(p_expires_at, now() + interval '30 days');

  INSERT INTO demo_magic_links (token, user_id, fleet_id, email, label, expires_at, created_by)
    VALUES (v_token, p_user_id, p_fleet_id, p_email, p_label, v_expires, p_created_by)
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object(
    'ok',       true,
    'token',    v_token,
    'link_id',  v_link_id,
    'expires_at', v_expires
  );
END;
$$;

COMMENT ON FUNCTION demo_create_magic_link(uuid, uuid, text, text, timestamptz, uuid) IS
  'Crée un nouveau magic link, désactive les anciens. SECURITY DEFINER.';

-- ─── 6. admin_list_demo_sessions() ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_list_demo_sessions(p_active_only boolean DEFAULT false)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux admins plateforme';
  END IF;

  SELECT jsonb_agg(row_to_json(s) ORDER BY s.created_at DESC)
    INTO v_result
    FROM (
      SELECT
        dp.user_id,
        COALESCE(dp.email, u.email)   AS email,
        dp.account_type,
        dp.demo_role,
        dp.is_active,
        dp.expires_at,
        dp.created_at,
        dp.deactivated_at,
        dp.last_login,
        dp.last_activity_at,
        dp.notes,
        dp.fleet_id,
        fl.name                        AS fleet_name,
        ml.token                       AS magic_link_token,
        ml.label                       AS magic_link_label,
        COALESCE(ml.used_count, 0)     AS used_count,
        ml.last_used_at,
        ml.expires_at                  AS link_expires_at,
        (
          SELECT COUNT(*)::int
            FROM demo_onboarding_logs ol
           WHERE ol.user_id = dp.user_id
        )                              AS onboarding_steps
      FROM demo_profiles dp
      LEFT JOIN auth.users u  ON u.id  = dp.user_id
      LEFT JOIN flottes fl    ON fl.id = dp.fleet_id
      LEFT JOIN LATERAL (
        SELECT token, label, used_count, last_used_at, expires_at
          FROM demo_magic_links dml
         WHERE dml.user_id = dp.user_id AND dml.is_active = true
         ORDER BY dml.created_at DESC
         LIMIT 1
      ) ml ON true
      WHERE (NOT p_active_only OR dp.is_active = true)
    ) s;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION admin_list_demo_sessions(boolean) IS
  'Vue enrichie des sessions démo pour l''admin UI. Admin plateforme uniquement.';

-- Grant explicite pour RPC côté client
GRANT EXECUTE ON FUNCTION admin_list_demo_sessions(boolean) TO authenticated;

-- ─── 7. admin_reset_demo_fleet() ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_reset_demo_fleet(p_fleet_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_deleted_vehicles  int := 0;
  v_deleted_logs      int := 0;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux admins plateforme';
  END IF;

  -- Vérifier que c'est bien une flotte démo
  IF NOT EXISTS (SELECT 1 FROM flottes WHERE id = p_fleet_id AND is_demo = true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_a_demo_fleet');
  END IF;

  -- Supprimer les véhicules
  WITH deleted AS (
    DELETE FROM vehicules WHERE fleet_id = p_fleet_id RETURNING id
  )
  SELECT COUNT(*)::int INTO v_deleted_vehicles FROM deleted;

  -- Supprimer les logs d'onboarding liés à cette flotte
  WITH deleted AS (
    DELETE FROM demo_onboarding_logs ol
     USING demo_profiles dp
     WHERE ol.user_id = dp.user_id
       AND dp.fleet_id = p_fleet_id
    RETURNING ol.id
  )
  SELECT COUNT(*)::int INTO v_deleted_logs FROM deleted;

  RETURN jsonb_build_object(
    'ok',               true,
    'fleet_id',         p_fleet_id,
    'vehicles_deleted', v_deleted_vehicles,
    'logs_deleted',     v_deleted_logs
  );
END;
$$;

COMMENT ON FUNCTION admin_reset_demo_fleet(uuid) IS
  'Réinitialise les données d''une flotte démo (véhicules + logs onboarding).';

GRANT EXECUTE ON FUNCTION admin_reset_demo_fleet(uuid) TO authenticated;
