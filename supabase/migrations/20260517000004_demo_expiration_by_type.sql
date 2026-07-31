-- ============================================================================
-- Migration : expiration différenciée par type de compte démo E-Samba
--
-- Types et durées :
--   investor   → 48h  (présentation investisseurs)
--   prospect   → 7j   (déjà géré par prospect_registrations, harmonisé ici)
--   internal   → permanent (équipe E-Samba)
--   dev        → permanent (environnement de développement)
--
-- Nouveautés :
--   - Colonne demo_profiles.expires_at (nullable = permanent)
--   - Colonne demo_profiles.notified_at (suivi notification J-1)
--   - demo_expiration_log : historique des expirations
--   - Fonctions : expire_demo_accounts_by_type(), notify_upcoming_expirations(),
--                 reactivate_demo_account(), get_demo_account_type_duration()
-- ============================================================================

-- ─── 1. Enrichissement demo_profiles ─────────────────────────────────────────

ALTER TABLE demo_profiles
  ADD COLUMN IF NOT EXISTS expires_at   timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notified_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index : expire_at pour le cron
CREATE INDEX IF NOT EXISTS idx_demo_profiles_expires_at
  ON demo_profiles (expires_at)
  WHERE is_active = true AND expires_at IS NOT NULL;

-- ─── 2. Durées par account_type ──────────────────────────────────────────────

-- Retourne la durée d'expiration en heures pour un type donné.
-- NULL = pas d'expiration (permanent).
CREATE OR REPLACE FUNCTION get_demo_account_type_duration(p_account_type text)
  RETURNS integer
  LANGUAGE sql
  IMMUTABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT CASE p_account_type
    WHEN 'investor'  THEN 48
    WHEN 'prospect'  THEN 168  -- 7j × 24h
    WHEN 'internal'  THEN NULL -- permanent
    WHEN 'dev'       THEN NULL -- permanent
    ELSE                  168  -- défaut : 7j
  END;
$$;

COMMENT ON FUNCTION get_demo_account_type_duration IS
  'Durée d''expiration en heures par type de compte démo. NULL = permanent.';

-- ─── 3. Calcul expires_at lors de la création / réactivation ─────────────────

CREATE OR REPLACE FUNCTION set_demo_account_expiry(
  p_user_id    uuid,
  p_created_at timestamptz DEFAULT now()
)
  RETURNS timestamptz
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_account_type text;
  v_duration_h   integer;
  v_expires_at   timestamptz;
BEGIN
  SELECT account_type INTO v_account_type
    FROM demo_profiles
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'demo_profile introuvable pour user_id=%', p_user_id;
  END IF;

  v_duration_h := get_demo_account_type_duration(v_account_type);

  -- NULL = permanent, pas de date d'expiration
  v_expires_at := CASE
    WHEN v_duration_h IS NULL THEN NULL
    ELSE p_created_at + (v_duration_h || ' hours')::interval
  END;

  UPDATE demo_profiles
     SET expires_at = v_expires_at,
         notified_at = NULL -- reset la notif si réactivation
   WHERE user_id = p_user_id;

  RETURN v_expires_at;
END;
$$;

COMMENT ON FUNCTION set_demo_account_expiry IS
  'Calcule et persiste expires_at selon le type de compte. Retourne NULL si permanent.';

-- ─── 4. Log d'expiration ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS demo_expiration_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  account_type text NOT NULL,
  action      text NOT NULL CHECK (action IN ('expired', 'reactivated', 'notified', 'manually_deactivated')),
  reason      text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL = cron automatique
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_expiration_log_user
  ON demo_expiration_log (user_id, created_at DESC);

-- RLS : service_role uniquement
ALTER TABLE demo_expiration_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_expiration_log_no_select ON public.demo_expiration_log;
CREATE POLICY demo_expiration_log_no_select
  ON demo_expiration_log
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false);

-- ─── 5. expire_demo_accounts_by_type() — cron principal ──────────────────────

CREATE OR REPLACE FUNCTION expire_demo_accounts_by_type()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_rec     record;
  v_count   integer := 0;
  v_errors  text[]  := '{}';
BEGIN
  FOR v_rec IN
    SELECT dp.user_id, dp.email, dp.account_type
      FROM demo_profiles dp
     WHERE dp.is_active    = true
       AND dp.expires_at   IS NOT NULL
       AND dp.expires_at   < now()
  LOOP
    BEGIN
      -- Désactiver le compte démo
      UPDATE demo_profiles
         SET is_active       = false,
             deactivated_at  = now()
       WHERE user_id = v_rec.user_id;

      -- Log
      INSERT INTO demo_expiration_log (user_id, email, account_type, action, reason)
        VALUES (v_rec.user_id, v_rec.email, v_rec.account_type, 'expired', 'expires_at dépassé');

      -- Audit général
      INSERT INTO demo_audit_logs (user_id, action, resource, status, metadata)
        VALUES (
          v_rec.user_id,
          'demo_account_expired',
          'demo_profiles',
          'allowed',
          jsonb_build_object(
            'email',        v_rec.email,
            'account_type', v_rec.account_type,
            'expired_at',   now()
          )
        );

      v_count := v_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, format('user %s: %s', v_rec.user_id, SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',            true,
    'expired_count', v_count,
    'errors',        to_jsonb(v_errors)
  );
END;
$$;

COMMENT ON FUNCTION expire_demo_accounts_by_type IS
  'Expire tous les comptes démo dont expires_at < now(). Appelé par le cron quotidien.';

-- ─── 6. notify_upcoming_expirations() — avertissement J-1 ───────────────────

CREATE OR REPLACE FUNCTION notify_upcoming_expirations(p_hours_before integer DEFAULT 24)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_rec     record;
  v_count   integer := 0;
  v_errors  text[]  := '{}';
BEGIN
  FOR v_rec IN
    SELECT dp.user_id, dp.email, dp.account_type, dp.expires_at
      FROM demo_profiles dp
     WHERE dp.is_active   = true
       AND dp.expires_at  IS NOT NULL
       AND dp.notified_at IS NULL                             -- pas encore notifié
       AND dp.expires_at  BETWEEN now()
                              AND now() + (p_hours_before || ' hours')::interval
  LOOP
    BEGIN
      -- Marquer comme notifié
      UPDATE demo_profiles
         SET notified_at = now()
       WHERE user_id = v_rec.user_id;

      -- Insérer dans la queue de notifications (traitée par Edge Function email)
      INSERT INTO notification_queue (
        to_email, template_id, metadata, status, created_at
      ) VALUES (
        v_rec.email,
        'demo_expiring_soon',
        jsonb_build_object(
          'account_type', v_rec.account_type,
          'expires_at',   v_rec.expires_at,
          'hours_before', p_hours_before
        ),
        'pending',
        now()
      ) ON CONFLICT DO NOTHING;

      -- Log
      INSERT INTO demo_expiration_log (user_id, email, account_type, action, reason)
        VALUES (v_rec.user_id, v_rec.email, v_rec.account_type, 'notified',
                format('notification J-%s envoyée', p_hours_before / 24));

      v_count := v_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, format('user %s: %s', v_rec.user_id, SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',             true,
    'notified_count', v_count,
    'errors',         to_jsonb(v_errors)
  );
END;
$$;

COMMENT ON FUNCTION notify_upcoming_expirations IS
  'Envoie une notification avant expiration. Par défaut : 24h avant (J-1).';

-- ─── 7. reactivate_demo_account() — admin seulement ──────────────────────────

CREATE OR REPLACE FUNCTION reactivate_demo_account(
  p_user_id        uuid,
  p_reactivated_by uuid,
  p_extend_hours   integer DEFAULT NULL  -- NULL = reprend la durée par défaut du type
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_rec      record;
  v_duration integer;
  v_expires  timestamptz;
BEGIN
  -- Vérifier que l'appelant est admin plateforme
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux admins plateforme';
  END IF;

  SELECT user_id, email, account_type, is_active
    INTO v_rec
    FROM demo_profiles
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'compte_introuvable');
  END IF;

  -- Calculer la nouvelle expiration
  IF p_extend_hours IS NOT NULL THEN
    v_expires := now() + (p_extend_hours || ' hours')::interval;
  ELSE
    v_duration := get_demo_account_type_duration(v_rec.account_type);
    v_expires  := CASE
      WHEN v_duration IS NULL THEN NULL
      ELSE now() + (v_duration || ' hours')::interval
    END;
  END IF;

  UPDATE demo_profiles
     SET is_active       = true,
         expires_at      = v_expires,
         notified_at     = NULL,
         deactivated_at  = NULL,
         deactivated_by  = NULL
   WHERE user_id = p_user_id;

  INSERT INTO demo_expiration_log (user_id, email, account_type, action, reason, performed_by)
    VALUES (
      v_rec.user_id, v_rec.email, v_rec.account_type,
      'reactivated',
      format('réactivé par admin, nouvelle expiration: %s', COALESCE(v_expires::text, 'permanent')),
      p_reactivated_by
    );

  RETURN jsonb_build_object(
    'ok',           true,
    'user_id',      p_user_id,
    'account_type', v_rec.account_type,
    'expires_at',   v_expires,
    'is_active',    true
  );
END;
$$;

COMMENT ON FUNCTION reactivate_demo_account IS
  'Réactive un compte démo expiré. Admin plateforme uniquement.';

-- ─── 8. deactivate_demo_account() — désactivation manuelle ──────────────────

CREATE OR REPLACE FUNCTION deactivate_demo_account(
  p_user_id      uuid,
  p_deactivated_by uuid,
  p_reason       text DEFAULT 'désactivation manuelle'
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_rec record;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux admins plateforme';
  END IF;

  SELECT user_id, email, account_type INTO v_rec
    FROM demo_profiles WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'compte_introuvable');
  END IF;

  UPDATE demo_profiles
     SET is_active      = false,
         deactivated_at = now(),
         deactivated_by = p_deactivated_by
   WHERE user_id = p_user_id;

  INSERT INTO demo_expiration_log (user_id, email, account_type, action, reason, performed_by)
    VALUES (v_rec.user_id, v_rec.email, v_rec.account_type,
            'manually_deactivated', p_reason, p_deactivated_by);

  RETURN jsonb_build_object('ok', true, 'user_id', p_user_id);
END;
$$;

COMMENT ON FUNCTION deactivate_demo_account IS
  'Désactive manuellement un compte démo. Admin plateforme uniquement.';

-- ─── 9. pg_cron — planification ──────────────────────────────────────────────

-- Remplacement du cron existant par la version typée (si cron activé)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    AND to_regnamespace('cron') IS NOT NULL
    AND to_regclass('cron.job') IS NOT NULL THEN
    -- Suppression de l'ancien cron prospect si présent
    EXECUTE 'SELECT cron.unschedule($1)'
      USING 'prospect-daily-expiration';

    -- Cron unifié : toutes les heures (comptes investor expirent en 48h, précision horaire utile)
    EXECUTE 'SELECT cron.schedule($1, $2, $3)'
      USING
        'demo-expiration-hourly',
        '0 * * * *',
        'SELECT expire_demo_accounts_by_type()';

    -- Notifications J-1 : une fois par jour à 10h UTC
    EXECUTE 'SELECT cron.schedule($1, $2, $3)'
      USING
        'demo-notify-expiring',
        '0 10 * * *',
        'SELECT notify_upcoming_expirations(24)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- pg_cron non disponible en dev local, ignoré
END;
$$;

-- ─── 10. Initialisation expires_at pour les comptes existants ────────────────

-- Mise à jour des comptes existants qui n'ont pas encore expires_at
UPDATE demo_profiles
   SET expires_at = CASE
     WHEN get_demo_account_type_duration(account_type) IS NULL THEN NULL
     ELSE created_at + (get_demo_account_type_duration(account_type) || ' hours')::interval
   END
 WHERE expires_at IS NULL
   AND is_active = true;

-- ─── Commentaires ─────────────────────────────────────────────────────────────

COMMENT ON TABLE demo_expiration_log IS
  'Historique des expirations, réactivations et notifications de comptes démo.';

COMMENT ON COLUMN demo_profiles.expires_at IS
  'Date d''expiration du compte. NULL = permanent (internal, dev).';

COMMENT ON COLUMN demo_profiles.notified_at IS
  'Date d''envoi de la notification pré-expiration. NULL = pas encore notifié.';
