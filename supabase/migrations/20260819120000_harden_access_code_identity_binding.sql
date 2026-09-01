BEGIN;

DO $$
BEGIN
  CREATE TYPE public.access_universe AS ENUM ('internal', 'temporary', 'real');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Access-universe helpers are used by RLS with the current user. Do not expose
-- them as arbitrary-user role/profile oracles to ordinary authenticated users.
CREATE OR REPLACE FUNCTION public.get_user_universe(p_user_id uuid DEFAULT auth.uid())
RETURNS public.access_universe
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid())
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'permission_refusee_identite';
  END IF;

  RETURN COALESCE(
    CASE WHEN EXISTS (
      SELECT 1 FROM public.admin_profiles
       WHERE user_id = p_user_id AND is_active = true
    ) THEN 'internal'::public.access_universe END,
    (SELECT universe FROM public.demo_profiles WHERE user_id = p_user_id AND is_active = true),
    CASE WHEN EXISTS (
      SELECT 1 FROM public.flotte_adhesions
       WHERE user_id = p_user_id AND is_active = true
    ) THEN 'real'::public.access_universe END,
    'real'::public.access_universe
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_internal_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid())
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'permission_refusee_identite';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
     WHERE user_id = p_user_id AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_temporary_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid())
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'permission_refusee_identite';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.demo_profiles
     WHERE user_id = p_user_id
       AND is_active = true
       AND account_type IN ('prospect', 'investor')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_real_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid())
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'permission_refusee_identite';
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.admin_profiles
     WHERE user_id = p_user_id AND is_active = true
  ) AND NOT EXISTS (
    SELECT 1 FROM public.demo_profiles
     WHERE user_id = p_user_id
       AND is_active = true
       AND account_type IN ('prospect', 'investor')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_create_demo_access(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid())
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'permission_refusee_identite';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
     WHERE user_id = p_user_id
       AND is_active = true
       AND internal_role IN ('admin', 'commercial')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_investor(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid())
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'permission_refusee_identite';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.demo_profiles
     WHERE user_id = p_user_id
       AND is_active = true
       AND account_type = 'investor'
  );
END;
$$;

CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  universe public.access_universe NOT NULL DEFAULT 'temporary',
  role_target text NOT NULL,
  max_uses int NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used_count int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  access_days int NOT NULL DEFAULT 7 CHECK (access_days >= 1),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  fleet_id uuid REFERENCES public.flottes(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  CONSTRAINT access_codes_used_lte_max CHECK (used_count <= max_uses),
  CONSTRAINT access_codes_role_target_check CHECK (
    role_target IN ('investor', 'prospect', 'commercial', 'dev', 'admin')
  ),
  CONSTRAINT access_codes_universe_role_coherence CHECK (
    (universe = 'temporary' AND role_target IN ('investor', 'prospect'))
    OR (universe = 'internal' AND role_target IN ('commercial', 'dev', 'admin'))
  )
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code
  ON public.access_codes (code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_access_codes_universe
  ON public.access_codes (universe) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_access_codes_expires
  ON public.access_codes (expires_at) WHERE is_active = true;

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_codes_admin_only ON public.access_codes;
CREATE POLICY access_codes_admin_only ON public.access_codes
  FOR ALL USING (public.is_internal_user());
GRANT SELECT, INSERT, UPDATE ON public.access_codes TO service_role;

CREATE TABLE IF NOT EXISTS public.access_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now(),
  ip_hint text,
  UNIQUE (code_id, user_id)
);

ALTER TABLE public.access_code_uses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_code_uses_admin_only ON public.access_code_uses;
CREATE POLICY access_code_uses_admin_only ON public.access_code_uses
  FOR ALL USING (public.is_internal_user());
GRANT SELECT, INSERT ON public.access_code_uses TO service_role;

CREATE OR REPLACE FUNCTION public.access_code_validate(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.access_codes%ROWTYPE;
BEGIN
  p_code := upper(trim(p_code));

  SELECT * INTO v_row
    FROM public.access_codes
   WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'code_not_found',
      'message', 'Code invalide. Verifiez la saisie ou contactez votre commercial.'
    );
  END IF;

  IF NOT v_row.is_active THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'code_revoked',
      'message', 'Ce code a ete desactive. Contactez l''equipe E-Samba.'
    );
  END IF;

  IF v_row.expires_at < now() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'code_expired',
      'message', 'Ce code a expire le ' || to_char(v_row.expires_at, 'DD/MM/YYYY') || '.'
    );
  END IF;

  IF v_row.used_count >= v_row.max_uses THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'code_exhausted',
      'message', 'Ce code a atteint son nombre maximum d''utilisations.'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code_id', v_row.id,
    'label', v_row.label,
    'universe', v_row.universe,
    'role_target', v_row.role_target,
    'access_days', v_row.access_days,
    'fleet_id', v_row.fleet_id,
    'uses_left', v_row.max_uses - v_row.used_count,
    'expires_at', v_row.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.access_code_validate(text) TO anon, authenticated, service_role;
-- Generate access codes from cryptographically secure database randomness.
CREATE OR REPLACE FUNCTION public.access_code_generate(p_prefix text DEFAULT 'SAMBA')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempt int := 0;
  v_prefix text := upper(regexp_replace(coalesce(p_prefix, 'SAMBA'), '[^A-Z0-9-]', '', 'g'));
BEGIN
  IF v_prefix = '' OR length(v_prefix) > 20 THEN
    RAISE EXCEPTION 'prefixe_code_invalide';
  END IF;

  LOOP
    -- 64 random bits encoded as uppercase hex. Prefixes remain human-readable.
    v_code := v_prefix || '-' || upper(encode(gen_random_bytes(8), 'hex'));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.access_codes WHERE code = v_code);
    v_attempt := v_attempt + 1;
    IF v_attempt > 10 THEN
      RAISE EXCEPTION 'Impossible de generer un code unique';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.access_code_generate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.access_code_generate(text) TO authenticated, service_role;

-- A user can consume a code only for their own authenticated identity. Backend
-- service-role flows may explicitly target another user when provisioning.
CREATE OR REPLACE FUNCTION public.access_code_consume(
  p_code text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validation jsonb;
  v_row public.access_codes%ROWTYPE;
  v_expires_at timestamptz;
  v_fleet_id uuid;
  v_target_user uuid;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_target_user := p_user_id;
  ELSE
    IF auth.uid() IS NULL THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'not_authenticated', 'message', 'Authentification requise.');
    END IF;
    IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'identity_mismatch', 'message', 'Ce code ne peut etre active que pour votre compte.');
    END IF;
    v_target_user := auth.uid();
  END IF;

  IF v_target_user IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'target_user_required');
  END IF;

  v_validation := public.access_code_validate(p_code);
  IF NOT COALESCE((v_validation->>'valid')::boolean, false) THEN
    RETURN v_validation;
  END IF;

  SELECT * INTO v_row
    FROM public.access_codes
   WHERE code = upper(trim(p_code))
   FOR UPDATE;

  IF NOT FOUND OR NOT v_row.is_active OR v_row.expires_at <= now()
     OR v_row.used_count >= v_row.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'code_unavailable', 'message', 'Ce code n''est plus disponible.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.access_code_uses
     WHERE code_id = v_row.id AND user_id = v_target_user
  ) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_used', 'message', 'Vous avez deja utilise ce code d''acces.');
  END IF;

  v_expires_at := now() + (v_row.access_days || ' days')::interval;
  v_fleet_id := COALESCE(v_row.fleet_id, public.prospect_get_demo_fleet_id());

  IF v_row.universe = 'temporary' THEN
    INSERT INTO public.demo_profiles (
      user_id, account_type, demo_role, fleet_id, is_active, expires_at, created_by
    ) VALUES (
      v_target_user, v_row.role_target, 'driver', v_fleet_id, true, v_expires_at, v_row.created_by
    ) ON CONFLICT (user_id) DO UPDATE SET
      account_type = EXCLUDED.account_type,
      fleet_id = EXCLUDED.fleet_id,
      is_active = true,
      expires_at = EXCLUDED.expires_at;

    IF v_fleet_id IS NOT NULL THEN
      INSERT INTO public.flotte_adhesions (user_id, fleet_id, role, is_active)
      VALUES (v_target_user, v_fleet_id, 'driver', true)
      ON CONFLICT (fleet_id, user_id) DO UPDATE SET role = 'driver', is_active = true;
    END IF;
  ELSIF v_row.universe = 'internal' THEN
    IF v_row.role_target NOT IN ('commercial', 'dev') THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'internal_role_forbidden');
    END IF;
    INSERT INTO public.admin_profiles (user_id, internal_role, is_active, created_by)
    VALUES (v_target_user, v_row.role_target, true, v_row.created_by)
    ON CONFLICT (user_id) DO UPDATE SET
      internal_role = EXCLUDED.internal_role,
      is_active = true;
  ELSE
    RETURN jsonb_build_object('valid', false, 'reason', 'unsupported_universe');
  END IF;

  UPDATE public.access_codes
     SET used_count = used_count + 1,
         last_used_at = now(),
         is_active = (used_count + 1 < max_uses)
   WHERE id = v_row.id;

  INSERT INTO public.access_code_uses(code_id, user_id)
  VALUES (v_row.id, v_target_user)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'valid', true,
    'user_id', v_target_user,
    'universe', v_row.universe,
    'role_target', v_row.role_target,
    'fleet_id', v_fleet_id,
    'expires_at', v_expires_at,
    'access_days', v_row.access_days
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.access_code_consume(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.access_code_consume(text, uuid) TO authenticated, service_role;

-- The creator identity is authoritative from auth.uid(); callers cannot borrow
-- another internal user's UUID. service_role may set an explicit creator for
-- audited backend workflows.
CREATE OR REPLACE FUNCTION public.access_code_create(
  p_universe public.access_universe DEFAULT 'temporary',
  p_role_target text DEFAULT 'prospect',
  p_label text DEFAULT NULL,
  p_max_uses int DEFAULT 1,
  p_access_days int DEFAULT 7,
  p_expires_in_days int DEFAULT 30,
  p_fleet_id uuid DEFAULT NULL,
  p_creator_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_creator_role text;
  v_code text;
  v_code_id uuid;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_creator_id := p_creator_id;
  ELSE
    IF auth.uid() IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
    END IF;
    IF p_creator_id IS NOT NULL AND p_creator_id IS DISTINCT FROM auth.uid() THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'identity_mismatch');
    END IF;
    v_creator_id := auth.uid();
  END IF;

  SELECT internal_role INTO v_creator_role
    FROM public.admin_profiles
   WHERE user_id = v_creator_id AND is_active = true;
  IF v_creator_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  IF p_max_uses < 1 OR p_max_uses > 100
     OR p_access_days < 1 OR p_access_days > 365
     OR p_expires_in_days < 1 OR p_expires_in_days > 365 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_limits');
  END IF;

  IF v_creator_role = 'commercial' AND p_universe <> 'temporary' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'commercial_cannot_create_internal');
  END IF;
  IF p_universe = 'temporary' AND p_role_target NOT IN ('investor', 'prospect') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_role_for_universe');
  END IF;
  IF p_universe = 'internal' AND p_role_target NOT IN ('commercial', 'dev') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_role_for_universe');
  END IF;
  IF p_fleet_id IS NOT NULL AND p_universe = 'temporary' AND NOT EXISTS (
    SELECT 1 FROM public.flottes WHERE id = p_fleet_id AND is_demo = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'temporary_code_requires_demo_fleet');
  END IF;

  v_code := public.access_code_generate(
    CASE p_role_target
      WHEN 'investor' THEN 'SAMBA-INV'
      WHEN 'prospect' THEN 'SAMBA-PRO'
      WHEN 'commercial' THEN 'SAMBA-COM'
      WHEN 'dev' THEN 'SAMBA-DEV'
      ELSE 'SAMBA'
    END
  );

  INSERT INTO public.access_codes(
    code, label, universe, role_target, max_uses, access_days,
    expires_at, fleet_id, created_by
  ) VALUES (
    v_code, nullif(trim(coalesce(p_label, '')), ''), p_universe, p_role_target,
    p_max_uses, p_access_days, now() + (p_expires_in_days || ' days')::interval,
    p_fleet_id, v_creator_id
  ) RETURNING id INTO v_code_id;

  RETURN jsonb_build_object(
    'ok', true, 'code_id', v_code_id, 'code', v_code,
    'universe', p_universe, 'role_target', p_role_target,
    'max_uses', p_max_uses, 'access_days', p_access_days,
    'expires_at', now() + (p_expires_in_days || ' days')::interval
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.access_code_create(public.access_universe, text, text, integer, integer, integer, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.access_code_create(public.access_universe, text, text, integer, integer, integer, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.access_code_revoke(
  p_code_id uuid,
  p_revoker uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revoker_id uuid;
  v_revoker_role text;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_revoker_id := p_revoker;
  ELSE
    IF auth.uid() IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
    END IF;
    IF p_revoker IS NOT NULL AND p_revoker IS DISTINCT FROM auth.uid() THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'identity_mismatch');
    END IF;
    v_revoker_id := auth.uid();
  END IF;

  SELECT internal_role INTO v_revoker_role
    FROM public.admin_profiles
   WHERE user_id = v_revoker_id AND is_active = true;
  IF v_revoker_role NOT IN ('admin', 'dev') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  UPDATE public.access_codes SET is_active = false WHERE id = p_code_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.access_code_revoke(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.access_code_revoke(uuid, uuid) TO authenticated, service_role;

-- Explicitly retain only the intended helper exposure.
REVOKE EXECUTE ON FUNCTION public.get_user_universe(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_internal_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_temporary_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_real_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_create_demo_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_investor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_universe(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_internal_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_temporary_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_real_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_create_demo_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_investor(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
