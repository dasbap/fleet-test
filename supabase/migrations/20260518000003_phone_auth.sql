-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 20260518000003 — Auth téléphone OTP : rate limiting
--
-- Stocke les tentatives d'envoi OTP pour anti-spam.
-- Pas de données sensibles — seulement phone + action + timestamp.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. Table otp_rate_limits ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Numéro en format E164 (ex: +237612345678)
  phone       text        NOT NULL,
  -- 'send' = envoi OTP | 'verify_fail' = échec de vérification
  action      text        NOT NULL CHECK (action IN ('send', 'verify_fail')),
  -- Métadonnées légères pour audit (jamais d'OTP ici)
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.otp_rate_limits IS
  'Journal des tentatives OTP pour anti-spam — pas de données sensibles.';

-- Index pour les requêtes de rate limiting (les plus récentes en premier)
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_phone_action
  ON public.otp_rate_limits (phone, action, created_at DESC);

-- RLS : service_role uniquement — jamais exposé au client
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY otp_rate_limits_service_only ON public.otp_rate_limits
  FOR ALL
  USING (false); -- Bloque tout accès authenticated; service_role contourne automatiquement

GRANT SELECT, INSERT ON public.otp_rate_limits TO service_role;


-- ─── 2. Fonction : vérifier le rate limit d'envoi OTP ────────────────────────
-- Retourne true si l'envoi est autorisé, false si bloqué.
-- Règles : max 3 envois par 10 min, max 10 par 1h.

CREATE OR REPLACE FUNCTION public.otp_can_send(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count_10m int;
  v_count_1h  int;
BEGIN
  SELECT COUNT(*) INTO v_count_10m
    FROM public.otp_rate_limits
   WHERE phone  = p_phone
     AND action = 'send'
     AND created_at > now() - interval '10 minutes';

  SELECT COUNT(*) INTO v_count_1h
    FROM public.otp_rate_limits
   WHERE phone  = p_phone
     AND action = 'send'
     AND created_at > now() - interval '1 hour';

  IF v_count_10m >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason',  'rate_limit_10m',
      'message', 'Trop de tentatives. Réessayez dans 10 minutes.'
    );
  END IF;

  IF v_count_1h >= 10 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason',  'rate_limit_1h',
      'message', 'Trop de tentatives. Réessayez dans 1 heure.'
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

COMMENT ON FUNCTION public.otp_can_send(text) IS
  'Vérifie si un envoi OTP est autorisé pour ce numéro (anti-spam).';

GRANT EXECUTE ON FUNCTION public.otp_can_send(text) TO service_role;


-- ─── 3. Fonction : enregistrer une tentative ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.otp_record_attempt(
  p_phone  text,
  p_action text,
  p_meta   jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.otp_rate_limits (phone, action, meta)
  VALUES (p_phone, p_action, p_meta);
$$;

GRANT EXECUTE ON FUNCTION public.otp_record_attempt(text, text, jsonb) TO service_role;


-- ─── 4. Cron : purge des entrées > 24h (données non sensibles, pas besoin de + long) ──

SELECT cron.schedule(
  'otp-rate-limits-purge',
  '0 4 * * *',   -- 04:00 UTC chaque nuit
  $$
    DELETE FROM public.otp_rate_limits
     WHERE created_at < now() - interval '24 hours';
  $$
);
