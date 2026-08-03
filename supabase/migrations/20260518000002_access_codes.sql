-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 20260518000002 — Codes d'accès E-Samba
--
-- Objectifs :
--   1. Table access_codes — codes courts lisibles par humain
--   2. RPC access_code_validate(code)  — vérifie sans consommer
--   3. RPC access_code_consume(code, user_id) — valide + lie à un utilisateur
--   4. RPC access_code_create(...)     — crée un code (admin + commercial)
--   5. RPC access_code_revoke(id)      — révoque un code (admin uniquement)
--   6. Cron pg_cron — désactivation auto des codes expirés (02:30 UTC)
--   7. Audit dans demo_audit_logs
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. Table access_codes ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.access_codes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code court lisible par humain (ex: SAMBA-INV-ABC1)
  code            text        NOT NULL UNIQUE,

  -- Étiquette commerciale (ex: "Salon Transport Douala 2026")
  label           text,

  -- Univers cible du code
  universe        public.access_universe NOT NULL DEFAULT 'temporary',

  -- Rôle attribué lors de la consommation du code
  -- Pour universe=temporary : 'investor' | 'prospect'
  -- Pour universe=internal  : 'commercial' | 'dev' (admin uniquement)
  role_target     text        NOT NULL,

  -- Limites d'utilisation
  max_uses        int         NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used_count      int         NOT NULL DEFAULT 0 CHECK (used_count >= 0),

  -- Durée de validité de l'accès accordé (en jours)
  access_days     int         NOT NULL DEFAULT 7 CHECK (access_days >= 1),

  -- Expiration du code lui-même (indépendant de l'accès accordé)
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '30 days'),

  -- Flotte démo cible (pour les codes investor/prospect)
  fleet_id        uuid        REFERENCES public.flottes(id) ON DELETE SET NULL,

  -- Qui a créé ce code
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz,

  CONSTRAINT access_codes_used_lte_max CHECK (used_count <= max_uses),
  CONSTRAINT access_codes_role_target_check CHECK (
    role_target IN ('investor', 'prospect', 'commercial', 'dev', 'admin')
  ),
  CONSTRAINT access_codes_universe_role_coherence CHECK (
    -- Un code internal ne peut pas créer un compte temporary et vice-versa
    (universe = 'temporary' AND role_target IN ('investor', 'prospect'))
    OR (universe = 'internal' AND role_target IN ('commercial', 'dev', 'admin'))
  )
);

COMMENT ON TABLE public.access_codes IS
  'Codes d''accès courts E-Samba — investisseurs, prospects, équipe interne.';

CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes (code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_access_codes_universe ON public.access_codes (universe) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_access_codes_expires ON public.access_codes (expires_at) WHERE is_active = true;

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Lecture : seul le service_role et les admins internes
DROP POLICY IF EXISTS access_codes_admin_only ON public.access_codes;
CREATE POLICY access_codes_admin_only ON public.access_codes
  FOR ALL
  USING (public.is_internal_user());

GRANT SELECT, INSERT, UPDATE ON public.access_codes TO service_role;


-- ─── 2. Table access_code_uses — journal des consommations ────────────────────

CREATE TABLE IF NOT EXISTS public.access_code_uses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id     uuid        NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at     timestamptz NOT NULL DEFAULT now(),
  ip_hint     text,       -- 4 derniers octets masqués pour audit (ex: *.*.*. 42)
  UNIQUE (code_id, user_id)   -- un utilisateur ne peut consommer un code qu'une fois
);

ALTER TABLE public.access_code_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS access_code_uses_admin_only ON public.access_code_uses;
CREATE POLICY access_code_uses_admin_only ON public.access_code_uses
  FOR ALL USING (public.is_internal_user());

GRANT SELECT, INSERT ON public.access_code_uses TO service_role;


-- ─── 3. Fonction : générer un code court ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.access_code_generate(
  p_prefix text DEFAULT 'SAMBA'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempt int := 0;
BEGIN
  LOOP
    -- Format : PREFIX-XXX-NNNN (lettres + chiffres, lisible)
    v_code := upper(p_prefix)
      || '-'
      || substring(md5(random()::text), 1, 3)
      || '-'
      || lpad(floor(random() * 9999 + 1)::text, 4, '0');

    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.access_codes WHERE code = v_code);

    v_attempt := v_attempt + 1;
    IF v_attempt > 20 THEN
      RAISE EXCEPTION 'Impossible de générer un code unique après 20 tentatives';
    END IF;
  END LOOP;

  RETURN upper(v_code);
END;
$$;


-- ─── 4. RPC : access_code_validate ────────────────────────────────────────────
-- Vérifie un code sans le consommer ni créer de compte.
-- Retourne les métadonnées du code pour affichage côté client.

CREATE OR REPLACE FUNCTION public.access_code_validate(
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.access_codes%ROWTYPE;
BEGIN
  -- Normalisation : majuscules, trim
  p_code := upper(trim(p_code));

  SELECT * INTO v_row
    FROM public.access_codes
   WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid',   false,
      'reason',  'code_not_found',
      'message', 'Code invalide. Vérifiez la saisie ou contactez votre commercial.'
    );
  END IF;

  IF NOT v_row.is_active THEN
    RETURN jsonb_build_object(
      'valid',   false,
      'reason',  'code_revoked',
      'message', 'Ce code a été désactivé. Contactez l''équipe E-Samba.'
    );
  END IF;

  IF v_row.expires_at < now() THEN
    RETURN jsonb_build_object(
      'valid',   false,
      'reason',  'code_expired',
      'message', 'Ce code a expiré le ' || to_char(v_row.expires_at, 'DD/MM/YYYY') || '.'
    );
  END IF;

  IF v_row.used_count >= v_row.max_uses THEN
    RETURN jsonb_build_object(
      'valid',   false,
      'reason',  'code_exhausted',
      'message', 'Ce code a atteint son nombre maximum d''utilisations.'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid',        true,
    'code_id',      v_row.id,
    'label',        v_row.label,
    'universe',     v_row.universe,
    'role_target',  v_row.role_target,
    'access_days',  v_row.access_days,
    'fleet_id',     v_row.fleet_id,
    'uses_left',    v_row.max_uses - v_row.used_count,
    'expires_at',   v_row.expires_at
  );
END;
$$;

COMMENT ON FUNCTION public.access_code_validate(text) IS
  'Vérifie un code d''accès sans le consommer — retourne les métadonnées ou un message d''erreur FR.';

GRANT EXECUTE ON FUNCTION public.access_code_validate(text) TO anon, authenticated, service_role;


-- ─── 5. RPC : access_code_consume ─────────────────────────────────────────────
-- Valide ET consomme le code pour un utilisateur donné.
-- Crée le profil approprié (demo_profiles ou admin_profiles) selon l'univers.

CREATE OR REPLACE FUNCTION public.access_code_consume(
  p_code    text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validation jsonb;
  v_row        public.access_codes%ROWTYPE;
  v_expires_at timestamptz;
  v_fleet_id   uuid;
BEGIN
  -- Validation préalable
  v_validation := public.access_code_validate(p_code);

  IF NOT (v_validation->>'valid')::boolean THEN
    RETURN v_validation;
  END IF;

  -- Récupérer la ligne complète (avec verrou pour éviter race condition)
  SELECT * INTO v_row
    FROM public.access_codes
   WHERE code = upper(trim(p_code))
     FOR UPDATE;

  -- Double-check après verrou
  IF v_row.used_count >= v_row.max_uses THEN
    RETURN jsonb_build_object(
      'valid',   false,
      'reason',  'code_exhausted',
      'message', 'Ce code vient d''être utilisé par quelqu''un d''autre.'
    );
  END IF;

  -- Vérifier que l'utilisateur n'a pas déjà utilisé ce code
  IF EXISTS (
    SELECT 1 FROM public.access_code_uses
    WHERE code_id = v_row.id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'valid',   false,
      'reason',  'already_used',
      'message', 'Vous avez déjà utilisé ce code d''accès.'
    );
  END IF;

  v_expires_at := now() + (v_row.access_days || ' days')::interval;
  v_fleet_id   := COALESCE(v_row.fleet_id, prospect_get_demo_fleet_id());

  -- ── Créer le profil selon l'univers ─────────────────────────────────────────

  IF v_row.universe = 'temporary' THEN
    -- Profil démo (prospect ou investisseur)
    INSERT INTO public.demo_profiles (
      user_id, account_type, demo_role, fleet_id,
      is_active, expires_at, created_by
    )
    VALUES (
      p_user_id,
      v_row.role_target,              -- 'prospect' ou 'investor'
      'driver',                        -- rôle démo par défaut
      v_fleet_id,
      true,
      v_expires_at,
      v_row.created_by
    )
    ON CONFLICT (user_id) DO UPDATE
      SET account_type = EXCLUDED.account_type,
          fleet_id     = EXCLUDED.fleet_id,
          is_active    = true,
          expires_at   = EXCLUDED.expires_at;

    -- Adhésion à la flotte démo
    IF v_fleet_id IS NOT NULL THEN
      INSERT INTO public.flotte_adhesions (user_id, fleet_id, role, is_active)
      VALUES (p_user_id, v_fleet_id, 'driver', true)
      ON CONFLICT (fleet_id, user_id, role) DO UPDATE
        SET is_active = true;
    END IF;

  ELSIF v_row.universe = 'internal' THEN
    -- Profil interne (commercial ou dev — jamais admin via code)
    IF v_row.role_target = 'admin' THEN
      RETURN jsonb_build_object(
        'valid',   false,
        'reason',  'admin_not_via_code',
        'message', 'Les comptes administrateurs ne peuvent pas être créés via un code.'
      );
    END IF;

    INSERT INTO public.admin_profiles (
      user_id, internal_role, is_active, created_by
    )
    VALUES (
      p_user_id,
      v_row.role_target,   -- 'commercial' ou 'dev'
      true,
      v_row.created_by
    )
    ON CONFLICT (user_id) DO UPDATE
      SET internal_role = EXCLUDED.internal_role,
          is_active     = true;
  END IF;

  -- ── Incrémenter le compteur ──────────────────────────────────────────────────

  UPDATE public.access_codes
     SET used_count   = used_count + 1,
         last_used_at = now(),
         is_active    = (used_count + 1 < max_uses)  -- désactive si max atteint
   WHERE id = v_row.id;

  -- ── Journal des consommations ────────────────────────────────────────────────

  INSERT INTO public.access_code_uses (code_id, user_id)
  VALUES (v_row.id, p_user_id)
  ON CONFLICT DO NOTHING;

  -- ── Audit ────────────────────────────────────────────────────────────────────

  PERFORM public.demo_log_action(
    p_user_id, NULL, 'access_code_consumed',
    jsonb_build_object(
      'code_id',     v_row.id,
      'code',        v_row.code,
      'universe',    v_row.universe,
      'role_target', v_row.role_target,
      'expires_at',  v_expires_at
    )
  );

  RETURN jsonb_build_object(
    'valid',        true,
    'user_id',      p_user_id,
    'universe',     v_row.universe,
    'role_target',  v_row.role_target,
    'fleet_id',     v_fleet_id,
    'expires_at',   v_expires_at,
    'access_days',  v_row.access_days
  );
END;
$$;

COMMENT ON FUNCTION public.access_code_consume(text, uuid) IS
  'Consomme un code d''accès et crée le profil utilisateur correspondant (démo ou interne).';

GRANT EXECUTE ON FUNCTION public.access_code_consume(text, uuid) TO authenticated, service_role;


-- ─── 6. RPC : access_code_create ──────────────────────────────────────────────
-- Crée un nouveau code d'accès. Accessible aux admins et commerciaux.
-- Un commercial ne peut créer que des codes temporary (investor/prospect).

CREATE OR REPLACE FUNCTION public.access_code_create(
  p_universe    public.access_universe DEFAULT 'temporary',
  p_role_target text                   DEFAULT 'prospect',
  p_label       text                   DEFAULT NULL,
  p_max_uses    int                    DEFAULT 1,
  p_access_days int                    DEFAULT 7,
  p_expires_in_days int                DEFAULT 30,
  p_fleet_id    uuid                   DEFAULT NULL,
  p_creator_id  uuid                   DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_role text;
  v_code         text;
  v_code_id      uuid;
BEGIN
  -- Vérifier que le créateur est un utilisateur interne
  SELECT internal_role INTO v_creator_role
    FROM public.admin_profiles
   WHERE user_id = p_creator_id AND is_active = true;

  IF v_creator_role IS NULL THEN
    RETURN jsonb_build_object(
      'ok',      false,
      'reason',  'not_authorized',
      'message', 'Seuls les membres de l''équipe interne peuvent créer des codes d''accès.'
    );
  END IF;

  -- Un commercial ne peut créer que des codes temporary
  IF v_creator_role = 'commercial' AND p_universe != 'temporary' THEN
    RETURN jsonb_build_object(
      'ok',      false,
      'reason',  'commercial_cannot_create_internal',
      'message', 'Un commercial ne peut créer que des codes pour investisseurs ou prospects.'
    );
  END IF;

  -- Un commercial ne peut pas créer de code admin
  IF p_role_target = 'admin' THEN
    RETURN jsonb_build_object(
      'ok',      false,
      'reason',  'admin_code_forbidden',
      'message', 'Les codes d''accès administrateur ne sont pas autorisés.'
    );
  END IF;

  -- Valider la cohérence univers/rôle
  IF p_universe = 'temporary' AND p_role_target NOT IN ('investor', 'prospect') THEN
    RETURN jsonb_build_object(
      'ok',      false,
      'reason',  'invalid_role_for_universe',
      'message', 'Un code temporaire ne peut créer qu''un compte investisseur ou prospect.'
    );
  END IF;

  IF p_universe = 'internal' AND p_role_target NOT IN ('commercial', 'dev') THEN
    RETURN jsonb_build_object(
      'ok',      false,
      'reason',  'invalid_role_for_universe',
      'message', 'Un code interne ne peut créer qu''un compte commercial ou développeur.'
    );
  END IF;

  -- Générer le code selon le rôle cible
  v_code := public.access_code_generate(
    CASE p_role_target
      WHEN 'investor'   THEN 'SAMBA-INV'
      WHEN 'prospect'   THEN 'SAMBA-PRO'
      WHEN 'commercial' THEN 'SAMBA-COM'
      WHEN 'dev'        THEN 'SAMBA-DEV'
      ELSE                   'SAMBA'
    END
  );

  -- Insérer le code
  INSERT INTO public.access_codes (
    code, label, universe, role_target,
    max_uses, access_days, expires_at,
    fleet_id, created_by
  )
  VALUES (
    v_code, p_label, p_universe, p_role_target,
    p_max_uses, p_access_days,
    now() + (p_expires_in_days || ' days')::interval,
    p_fleet_id, p_creator_id
  )
  RETURNING id INTO v_code_id;

  -- Audit
  PERFORM public.demo_log_action(
    p_creator_id, NULL, 'access_code_created',
    jsonb_build_object(
      'code_id',     v_code_id,
      'code',        v_code,
      'universe',    p_universe,
      'role_target', p_role_target,
      'max_uses',    p_max_uses,
      'access_days', p_access_days
    )
  );

  RETURN jsonb_build_object(
    'ok',          true,
    'code_id',     v_code_id,
    'code',        v_code,
    'universe',    p_universe,
    'role_target', p_role_target,
    'max_uses',    p_max_uses,
    'access_days', p_access_days,
    'expires_at',  now() + (p_expires_in_days || ' days')::interval
  );
END;
$$;

COMMENT ON FUNCTION public.access_code_create IS
  'Crée un code d''accès — admin peut tout créer, commercial uniquement investor/prospect.';

GRANT EXECUTE ON FUNCTION public.access_code_create TO authenticated, service_role;


-- ─── 7. RPC : access_code_revoke ──────────────────────────────────────────────
-- Révoque un code (admin uniquement).

CREATE OR REPLACE FUNCTION public.access_code_revoke(
  p_code_id   uuid,
  p_revoker   uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revoker_role text;
BEGIN
  SELECT internal_role INTO v_revoker_role
    FROM public.admin_profiles
   WHERE user_id = p_revoker AND is_active = true;

  IF v_revoker_role NOT IN ('admin', 'dev') THEN
    RETURN jsonb_build_object(
      'ok',      false,
      'reason',  'not_authorized',
      'message', 'Seul un administrateur peut révoquer un code d''accès.'
    );
  END IF;

  UPDATE public.access_codes
     SET is_active = false
   WHERE id = p_code_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  PERFORM public.demo_log_action(
    p_revoker, NULL, 'access_code_revoked',
    jsonb_build_object('code_id', p_code_id)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.access_code_revoke(uuid, uuid) TO authenticated, service_role;


-- ─── 8. Vue admin : v_access_codes ────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_access_codes AS
SELECT
  ac.id,
  ac.code,
  ac.label,
  ac.universe,
  ac.role_target,
  ac.max_uses,
  ac.used_count,
  ac.max_uses - ac.used_count   AS uses_remaining,
  ac.access_days,
  ac.expires_at,
  ac.is_active,
  ac.last_used_at,
  ac.created_at,
  u.email                       AS created_by_email,
  f.name                        AS fleet_name
FROM public.access_codes ac
LEFT JOIN auth.users u ON u.id = ac.created_by
LEFT JOIN public.flottes f ON f.id = ac.fleet_id;

REVOKE ALL ON public.v_access_codes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_access_codes TO service_role;

COMMENT ON VIEW public.v_access_codes IS
  'Vue enrichie des codes d''accès — accessible service_role et admins internes uniquement.';


-- ─── 9. Cron : expiration automatique des codes ───────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    AND to_regnamespace('cron') IS NOT NULL
    AND to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE 'SELECT cron.schedule($1, $2, $3)'
      USING
  'access-codes-expire',
  '30 2 * * *',   -- 02:30 UTC, après le cron expire-demo-accounts (02:00)
  $cron$
    UPDATE public.access_codes
       SET is_active = false
     WHERE is_active = true
       AND expires_at < now();
  $cron$;
  ELSE
    RAISE NOTICE 'pg_cron non disponible - planification access-codes-expire ignoree.';
  END IF;
END $$;
