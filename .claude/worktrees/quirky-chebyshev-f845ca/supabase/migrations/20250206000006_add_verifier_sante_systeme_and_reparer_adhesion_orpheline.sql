-- =====================================================
-- Migration: Ajout verifier_sante_systeme et reparer_adhesion_orpheline
-- Les paramètres utilisent p_fleet_id pour correspondre au frontend (useSystemHealth).
-- =====================================================

DROP FUNCTION IF EXISTS public.verifier_sante_systeme(uuid);
DROP FUNCTION IF EXISTS public.check_system_health(uuid);

CREATE OR REPLACE FUNCTION public.verifier_sante_systeme(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orphan_count int;
  v_orphan_users jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM flotte_adhesions fa
    WHERE fa.fleet_id = p_fleet_id
      AND fa.user_id = auth.uid()
      AND fa.role IN ('manager', 'organizer')
      AND fa.is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  SELECT count(*)::int INTO v_orphan_count
  FROM profils p
  WHERE NOT EXISTS (
    SELECT 1
    FROM flotte_adhesions fa
    WHERE fa.user_id = p.user_id
      AND fa.fleet_id = p_fleet_id
      AND fa.is_active = true
  );

  SELECT coalesce(
    jsonb_agg(rec),
    '[]'::jsonb
  ) INTO v_orphan_users
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'email', u.email,
      'full_name', p.full_name,
      'created_at', u.created_at
    ) AS rec
    FROM profils p
    JOIN auth.users u ON u.id = p.user_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM flotte_adhesions fa
      WHERE fa.user_id = p.user_id
        AND fa.fleet_id = p_fleet_id
        AND fa.is_active = true
    )
    LIMIT 50
  ) sub;

  RETURN jsonb_build_object(
    'ok', true,
    'orphan_count', v_orphan_count,
    'orphan_users', coalesce(v_orphan_users, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verifier_sante_systeme(uuid) TO authenticated;

COMMENT ON FUNCTION public.verifier_sante_systeme(uuid) IS
'Vérifie la santé du système pour une flotte (utilisateurs orphelins). Retourne orphan_count et orphan_users.';

DROP FUNCTION IF EXISTS public.reparer_adhesion_orpheline(uuid, uuid, role_type);

CREATE OR REPLACE FUNCTION public.reparer_adhesion_orpheline(
  p_user_id uuid,
  p_fleet_id uuid,
  p_role role_type DEFAULT 'driver'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM flotte_adhesions fa
    WHERE fa.fleet_id = p_fleet_id
      AND fa.user_id = auth.uid()
      AND fa.role IN ('manager', 'organizer')
      AND fa.is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM flottes WHERE id = p_fleet_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'fleet_not_found');
  END IF;

  SELECT id INTO v_membership_id
  FROM flotte_adhesions
  WHERE fleet_id = p_fleet_id
    AND user_id = p_user_id
    AND is_active = true;

  IF v_membership_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'error', null,
      'membership_id', v_membership_id,
      'message', 'already_exists'
    );
  END IF;

  INSERT INTO flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (p_fleet_id, p_user_id, p_role, true)
  RETURNING id INTO v_membership_id;

  RETURN jsonb_build_object(
    'ok', true,
    'error', null,
    'membership_id', v_membership_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reparer_adhesion_orpheline(uuid, uuid, role_type) TO authenticated;

COMMENT ON FUNCTION public.reparer_adhesion_orpheline(uuid, uuid, role_type) IS
'Répare un membership orphelin pour un utilisateur dans une flotte.';
