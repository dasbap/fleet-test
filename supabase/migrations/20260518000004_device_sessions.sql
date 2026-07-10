-- ============================================================
-- Migration : Gestion appareils connectés E-Samba
-- Tables : user_sessions, session_events, trusted_devices,
--          security_notifications
-- RPCs   : track_session, revoke_session, trust_session,
--          revoke_all_other_sessions, mark_notification_read
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- fingerprint pour déduplication (hash UA + IP)
  device_fingerprint  text,
  device_name         text        NOT NULL DEFAULT 'Appareil inconnu',
  device_type         text        NOT NULL DEFAULT 'unknown'
                      CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  browser             text        NOT NULL DEFAULT 'Navigateur inconnu',
  os                  text        NOT NULL DEFAULT 'OS inconnu',
  ip_address          text,
  city                text,
  region              text,
  country_code        text,
  country_name        text,
  -- session Supabase auth correspondante (pour invalidation)
  supabase_session_id text,
  is_current          boolean     NOT NULL DEFAULT false,
  is_trusted          boolean     NOT NULL DEFAULT false,
  last_active_at      timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz,
  revoked_by          uuid        REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.session_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        REFERENCES public.user_sessions(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text        NOT NULL
              CHECK (event_type IN ('login','logout','revoked','trusted','untrusted','activity','suspicious')),
  ip_address  text,
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  uuid        REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  type        text        NOT NULL
              CHECK (type IN ('new_device','suspicious_location','session_revoked','trusted_added','mass_revoke')),
  title       text        NOT NULL,
  body        text        NOT NULL,
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON public.user_sessions(user_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_fingerprint
  ON public.user_sessions(device_fingerprint, user_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_session_events_session
  ON public.session_events(session_id);

CREATE INDEX IF NOT EXISTS idx_security_notifications_user
  ON public.security_notifications(user_id, is_read, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_notifications  ENABLE ROW LEVEL SECURITY;

-- user_sessions : lecture + modification propres sessions uniquement
CREATE POLICY "user_sessions_select_own"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_sessions_insert_own"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sessions_update_own"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- session_events : lecture uniquement
CREATE POLICY "session_events_select_own"
  ON public.session_events FOR SELECT
  USING (auth.uid() = user_id);

-- security_notifications : lecture + mise à jour (mark read)
CREATE POLICY "security_notifications_select_own"
  ON public.security_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "security_notifications_update_own"
  ON public.security_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Fonctions RPC ─────────────────────────────────────────────────────────────

-- Enregistre ou met à jour une session (appelé par l'Edge Function session-tracker)
-- SECURITY DEFINER pour que l'Edge Function (service_role) puisse écrire
CREATE OR REPLACE FUNCTION public.track_session(
  p_user_id             uuid,
  p_fingerprint         text,
  p_device_name         text,
  p_device_type         text,
  p_browser             text,
  p_os                  text,
  p_ip                  text,
  p_city                text,
  p_region              text,
  p_country_code        text,
  p_country_name        text,
  p_supabase_session_id text DEFAULT NULL
)
RETURNS TABLE (
  session_id    uuid,
  is_new_device boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id    uuid;
  v_is_new_device boolean := false;
  v_existing      uuid;
BEGIN
  -- Chercher session active avec même fingerprint
  SELECT id INTO v_existing
  FROM public.user_sessions
  WHERE user_id         = p_user_id
    AND device_fingerprint = p_fingerprint
    AND revoked_at IS NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- Mettre à jour last_active + marquer current
    UPDATE public.user_sessions SET
      last_active_at      = now(),
      is_current          = true,
      supabase_session_id = COALESCE(p_supabase_session_id, supabase_session_id)
    WHERE id = v_existing;

    v_session_id := v_existing;
  ELSE
    -- Nouvelle session → désactiver is_current des autres
    UPDATE public.user_sessions SET is_current = false
    WHERE user_id = p_user_id AND revoked_at IS NULL;

    INSERT INTO public.user_sessions (
      user_id, device_fingerprint, device_name, device_type,
      browser, os, ip_address, city, region,
      country_code, country_name, supabase_session_id,
      is_current, is_trusted
    ) VALUES (
      p_user_id, p_fingerprint, p_device_name, p_device_type,
      p_browser, p_os, p_ip, p_city, p_region,
      p_country_code, p_country_name, p_supabase_session_id,
      true, false
    )
    RETURNING id INTO v_session_id;

    v_is_new_device := true;

    -- Log login event
    INSERT INTO public.session_events (session_id, user_id, event_type, ip_address, meta)
    VALUES (v_session_id, p_user_id, 'login', p_ip,
      jsonb_build_object('device', p_device_name, 'city', p_city));
  END IF;

  RETURN QUERY SELECT v_session_id, v_is_new_device;
END;
$$;

-- Révoque une session (désactive + log)
CREATE OR REPLACE FUNCTION public.revoke_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Vérifier que la session appartient à l'utilisateur courant
  SELECT user_id INTO v_user_id
  FROM public.user_sessions
  WHERE id = p_session_id AND revoked_at IS NULL;

  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RETURN false;
  END IF;

  UPDATE public.user_sessions SET
    revoked_at = now(),
    revoked_by = auth.uid(),
    is_current = false
  WHERE id = p_session_id;

  INSERT INTO public.session_events (session_id, user_id, event_type)
  VALUES (p_session_id, v_user_id, 'revoked');

  -- Notification
  INSERT INTO public.security_notifications (user_id, session_id, type, title, body)
  SELECT
    v_user_id, p_session_id, 'session_revoked',
    'Session déconnectée',
    'Un appareil a été déconnecté de votre compte.'
  FROM public.user_sessions
  WHERE id = p_session_id;

  RETURN true;
END;
$$;

-- Révoque toutes les sessions sauf la courante
CREATE OR REPLACE FUNCTION public.revoke_all_other_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH revoked AS (
    UPDATE public.user_sessions SET
      revoked_at = now(),
      revoked_by = auth.uid(),
      is_current = false
    WHERE user_id    = auth.uid()
      AND is_current = false
      AND revoked_at IS NULL
    RETURNING id, user_id
  )
  SELECT count(*) INTO v_count FROM revoked;

  IF v_count > 0 THEN
    INSERT INTO public.session_events (session_id, user_id, event_type, meta)
    SELECT id, user_id, 'revoked',
      jsonb_build_object('bulk', true, 'count', v_count)
    FROM public.user_sessions
    WHERE user_id = auth.uid()
      AND revoked_at IS NOT NULL
      AND revoked_by = auth.uid()
      AND revoked_at >= now() - interval '5 seconds';

    INSERT INTO public.security_notifications (user_id, type, title, body)
    VALUES (
      auth.uid(), 'mass_revoke',
      'Appareils déconnectés',
      v_count || ' appareil(s) ont été déconnectés de votre compte.'
    );
  END IF;

  RETURN v_count;
END;
$$;

-- Marque un appareil comme de confiance
CREATE OR REPLACE FUNCTION public.trust_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  UPDATE public.user_sessions SET is_trusted = true
  WHERE id = p_session_id AND user_id = auth.uid() AND revoked_at IS NULL;
  GET DIAGNOSTICS v_ok = ROW_COUNT;

  IF v_ok THEN
    INSERT INTO public.session_events (session_id, user_id, event_type)
    VALUES (p_session_id, auth.uid(), 'trusted');
    INSERT INTO public.security_notifications (user_id, session_id, type, title, body)
    VALUES (auth.uid(), p_session_id, 'trusted_added',
      'Appareil de confiance', 'Un appareil a été marqué comme sûr.');
  END IF;
  RETURN v_ok;
END;
$$;

-- Marque notifications comme lues
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.security_notifications SET is_read = true
  WHERE user_id = auth.uid()
    AND is_read = false
    AND (p_ids IS NULL OR id = ANY(p_ids));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── Cron : purge sessions révoquées > 90 jours ────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    AND to_regnamespace('cron') IS NOT NULL
    AND to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE 'SELECT cron.schedule($1, $2, $3)'
      USING
  'purge-old-revoked-sessions',
  '0 3 * * *',
  $cron$
    DELETE FROM public.user_sessions
    WHERE revoked_at IS NOT NULL
      AND revoked_at < now() - interval '90 days';
    DELETE FROM public.security_notifications
    WHERE created_at < now() - interval '90 days' AND is_read = true;
  $cron$;
  ELSE
    RAISE NOTICE 'pg_cron non disponible - planification purge-old-revoked-sessions ignoree.';
  END IF;
END $$;
