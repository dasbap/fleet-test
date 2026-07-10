-- Restore contracts required by clean migration replay integration tests.
--
-- The active membership RPCs now upsert by one membership per user/fleet, and
-- billing plan guard RPCs are called by both authenticated clients and backend
-- service-role integration helpers.

DO $$
BEGIN
  IF to_regclass('public.flotte_adhesions') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS flotte_adhesions_fleet_user_unique
      ON public.flotte_adhesions (fleet_id, user_id);
  END IF;

  IF to_regclass('public.flotte_adhesions') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.flotte_adhesions TO authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'alert_type'
  ) THEN
    ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'dvir_unsafe';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(
  p_fleet_id uuid,
  p_user_id uuid,
  p_role public.role_type,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
  v_is_manager boolean;
  v_is_organizer boolean;
  v_fleet_has_active_members boolean;
  v_existing_role public.role_type;
  v_role_changing boolean;
  v_check jsonb;
  v_is_bootstrap boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusee : utilisateur non authentifie.';
  END IF;

  SELECT fa.role INTO v_existing_role
  FROM public.flotte_adhesions fa
  WHERE fa.fleet_id = p_fleet_id
    AND fa.user_id = p_user_id
  LIMIT 1;

  v_role_changing := v_existing_role IS NULL OR v_existing_role IS DISTINCT FROM p_role;

  SELECT
    public.has_role(p_fleet_id, 'manager'::public.role_type),
    public.has_role(p_fleet_id, 'organizer'::public.role_type)
  INTO v_is_manager, v_is_organizer;

  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = p_fleet_id
      AND fa.is_active = true
  ) INTO v_fleet_has_active_members;

  v_is_bootstrap := (
    p_user_id = auth.uid()
    AND p_role = 'organizer'::public.role_type
    AND p_is_active = true
    AND NOT v_fleet_has_active_members
  );

  IF NOT (v_is_manager OR v_is_organizer) THEN
    IF NOT v_is_bootstrap THEN
      RAISE EXCEPTION 'Permission refusee : role manager/organizer requis pour modifier les adhesions.';
    END IF;
  END IF;

  IF v_role_changing AND p_is_active AND NOT v_is_bootstrap THEN
    v_check := public.rbac_check_permission('member.update_role', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'Permission refusee : seul l''organisateur peut modifier les roles.';
    END IF;
  END IF;

  IF NOT p_is_active AND NOT (v_is_manager OR v_is_organizer OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'Permission refusee : impossible de desactiver ce membre.';
  END IF;

  INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (p_fleet_id, p_user_id, p_role, p_is_active)
  ON CONFLICT (fleet_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    created_at = CASE
      WHEN public.flotte_adhesions.is_active = false AND EXCLUDED.is_active = true
      THEN now()
      ELSE public.flotte_adhesions.created_at
    END
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_fleet_membership(
  p_fleet_id uuid,
  p_user_id uuid,
  p_role public.role_type,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.creer_ou_mettre_a_jour_adhesion_flotte(
    p_fleet_id,
    p_user_id,
    p_role,
    p_is_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_fleet_membership(uuid, uuid, public.role_type, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_fleet_membership(uuid, uuid, public.role_type, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_fleet_membership(uuid, uuid, public.role_type, boolean) FROM anon;

DO $$
BEGIN
  IF to_regprocedure('public.can_create_vehicle(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.can_create_vehicle(uuid) TO authenticated, service_role;
    REVOKE EXECUTE ON FUNCTION public.can_create_vehicle(uuid) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.can_create_vehicle(uuid) FROM anon;
  END IF;

  IF to_regprocedure('public.get_plan_access(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_plan_access(uuid) TO authenticated, service_role;
    REVOKE EXECUTE ON FUNCTION public.get_plan_access(uuid) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.get_plan_access(uuid) FROM anon;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
