-- ============================================================================
-- Migration : correctifs sécurité pré-commercialisation
--
-- Fixes :
--   1. prospect_create_account() — validation fleet_id.is_demo = true
--   2. demo_rate_limits         — table de comptage pour rate-limiting Edge Functions
--   3. Index + cleanup optimisations
-- ============================================================================

-- ─── 1. Validation fleet_id dans prospect_create_account() ───────────────────

CREATE OR REPLACE FUNCTION prospect_create_account(
  p_user_id      uuid,
  p_email        text,
  p_company_name text    DEFAULT NULL,
  p_invited_by   uuid    DEFAULT NULL,
  p_fleet_id     uuid    DEFAULT NULL,
  p_trial_days   integer DEFAULT 7
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_fleet_id   uuid;
  v_trial_end  timestamptz;
  v_expires_at timestamptz;
BEGIN
  -- ── Validation fleet_id : doit être une flotte is_demo ────────────────────
  IF p_fleet_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM flottes WHERE id = p_fleet_id AND is_demo = true
    ) THEN
      RAISE EXCEPTION 'not_a_demo_fleet : la flotte % n''est pas is_demo=true', p_fleet_id;
    END IF;
    v_fleet_id := p_fleet_id;
  ELSE
    -- Auto-sélection : flotte démo avec le moins de prospects actifs
    SELECT f.id INTO v_fleet_id
      FROM flottes f
      LEFT JOIN demo_profiles dp ON dp.fleet_id = f.id AND dp.is_active = true
     WHERE f.is_demo = true
     GROUP BY f.id
     ORDER BY COUNT(dp.user_id) ASC
     LIMIT 1;

    IF v_fleet_id IS NULL THEN
      RAISE EXCEPTION 'no_demo_fleet_available : aucune flotte démo configurée';
    END IF;
  END IF;

  v_trial_end  := now() + (p_trial_days || ' days')::interval;
  v_expires_at := v_trial_end;

  -- ── demo_profiles ─────────────────────────────────────────────────────────
  INSERT INTO demo_profiles (
    user_id, email, fleet_id, account_type, demo_role,
    is_active, expires_at, created_by
  )
  VALUES (
    p_user_id, p_email, v_fleet_id, 'prospect', 'driver',
    true, v_expires_at, p_invited_by
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email      = EXCLUDED.email,
        fleet_id   = EXCLUDED.fleet_id,
        is_active  = true,
        expires_at = EXCLUDED.expires_at;

  -- ── flotte_adhesions ──────────────────────────────────────────────────────
  INSERT INTO flotte_adhesions (user_id, fleet_id, role, statut, rejoint_le)
    VALUES (p_user_id, v_fleet_id, 'driver', 'actif', now())
    ON CONFLICT (user_id, fleet_id) DO UPDATE
      SET role     = 'driver',
          statut   = 'actif',
          rejoint_le = now();

  -- ── prospect_registrations ────────────────────────────────────────────────
  INSERT INTO prospect_registrations (
    user_id, email, company_name, fleet_id,
    trial_start, trial_end, status, invited_by
  )
  VALUES (
    p_user_id, p_email, p_company_name, v_fleet_id,
    now(), v_trial_end, 'active', p_invited_by
  )
  ON CONFLICT (user_id) DO UPDATE
    SET trial_end  = EXCLUDED.trial_end,
        status     = 'active';

  -- ── Audit ─────────────────────────────────────────────────────────────────
  INSERT INTO demo_audit_logs (user_id, action, resource, status, metadata)
    VALUES (
      p_user_id,
      'demo_create_prospect',
      'prospect_registrations',
      'allowed',
      jsonb_build_object(
        'email',        p_email,
        'company_name', p_company_name,
        'fleet_id',     v_fleet_id,
        'trial_days',   p_trial_days,
        'invited_by',   p_invited_by
      )
    );

  RETURN jsonb_build_object(
    'ok',        true,
    'user_id',   p_user_id,
    'fleet_id',  v_fleet_id,
    'trial_end', v_trial_end
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION prospect_create_account(uuid, text, text, uuid, uuid, integer) IS
  'Crée un compte prospect démo. Valide que fleet_id est bien is_demo=true.';

-- ─── 2. Table demo_rate_limits — comptage rate-limiting Edge Functions ────────

CREATE TABLE IF NOT EXISTS demo_rate_limits (
  key         text        NOT NULL,            -- ex: "create_prospect:token_hash", "validate:token_uuid"
  window_hour timestamptz NOT NULL,            -- tronqué à l'heure (date_trunc('hour', now()))
  count       int         NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, window_hour)
);

-- Purge automatique : expire après 25h (heure en cours + 1h de sécurité)
CREATE INDEX IF NOT EXISTS idx_demo_rate_limits_window
  ON demo_rate_limits (window_hour);

-- Fonction d'incrémentation + vérification atomique
CREATE OR REPLACE FUNCTION demo_check_rate_limit(
  p_key       text,
  p_max_count integer
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_window  timestamptz := date_trunc('hour', now());
  v_count   int;
BEGIN
  -- Purge des fenêtres vieilles de plus de 2h (évite table bloat)
  DELETE FROM demo_rate_limits WHERE window_hour < now() - interval '2 hours';

  INSERT INTO demo_rate_limits (key, window_hour, count, updated_at)
    VALUES (p_key, v_window, 1, now())
    ON CONFLICT (key, window_hour) DO UPDATE
      SET count      = demo_rate_limits.count + 1,
          updated_at = now()
  RETURNING count INTO v_count;

  IF v_count > p_max_count THEN
    -- Décrémenter (ne pas compter les requêtes refusées)
    UPDATE demo_rate_limits
       SET count = count - 1
     WHERE key = p_key AND window_hour = v_window;

    RETURN jsonb_build_object(
      'ok',        false,
      'error',     'rate_limit_exceeded',
      'count',     v_count - 1,
      'max',       p_max_count,
      'reset_at',  v_window + interval '1 hour'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'count', v_count, 'max', p_max_count);
END;
$$;

COMMENT ON FUNCTION demo_check_rate_limit IS
  'Vérifie et incrémente un compteur de rate-limiting par fenêtre horaire. Atomique.';

-- Accessible aux Edge Functions via service_role (pas authenticated)
-- Note : Edge Functions utilisent service_role_key → accès direct sans RLS

-- RLS sur demo_rate_limits : lecture interdite au public
ALTER TABLE demo_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_rate_limits_no_public ON demo_rate_limits;
CREATE POLICY demo_rate_limits_no_public
  ON demo_rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false);

-- ─── 3. Index manquants ───────────────────────────────────────────────────────

-- Accélère is_demo_user() appelé dans chaque requête RLS démo
CREATE INDEX IF NOT EXISTS idx_demo_profiles_user_active
  ON demo_profiles (user_id)
  WHERE is_active = true;

-- Accélère la recherche de flottes démo disponibles pour auto-sélection
CREATE INDEX IF NOT EXISTS idx_flottes_is_demo
  ON flottes (id)
  WHERE is_demo = true;
