BEGIN;

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
  v_existing_role public.role_type;
  v_existing_active boolean;
  v_check jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusee : utilisateur non authentifie.';
  END IF;

  SELECT fa.role, fa.is_active
    INTO v_existing_role, v_existing_active
    FROM public.flotte_adhesions fa
   WHERE fa.fleet_id = p_fleet_id
     AND fa.user_id = p_user_id
   LIMIT 1;

  IF v_existing_role IS NULL THEN
    IF p_role = 'organizer'::public.role_type AND NOT public.is_platform_admin() THEN
      v_check := public.rbac_check_permission('member.update_role', p_fleet_id);
      IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
        RAISE EXCEPTION 'Permission refusee : seul organizer peut creer un organizer.';
      END IF;
    ELSE
      v_check := public.rbac_check_permission('member.invite', p_fleet_id);
      IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
        RAISE EXCEPTION 'Permission refusee : member.invite requis.';
      END IF;
    END IF;
  ELSIF v_existing_role IS DISTINCT FROM p_role THEN
    v_check := public.rbac_check_permission('member.update_role', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'Permission refusee : seul organizer peut modifier les roles.';
    END IF;
  END IF;

  IF NOT p_is_active THEN
    v_check := public.rbac_check_permission('member.remove', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false)
       AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Permission refusee : member.remove requis.';
    END IF;
  ELSIF v_existing_role IS NOT NULL
        AND v_existing_active IS FALSE
        AND v_existing_role IS NOT DISTINCT FROM p_role THEN
    v_check := public.rbac_check_permission('member.invite', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false)
       AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Permission refusee : member.invite requis pour reactiver.';
    END IF;
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

REVOKE EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean)
  TO authenticated;

DROP POLICY IF EXISTS memberships_insert_manager_org ON public.flotte_adhesions;
DROP POLICY IF EXISTS memberships_update_manager_org ON public.flotte_adhesions;
DROP POLICY IF EXISTS memberships_delete_manager_org ON public.flotte_adhesions;

CREATE POLICY memberships_insert_role_bounded
ON public.flotte_adhesions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR public.has_role(fleet_id, 'organizer'::public.role_type)
  OR (
    public.has_role(fleet_id, 'manager'::public.role_type)
    AND role IS DISTINCT FROM 'organizer'::public.role_type
  )
);

CREATE POLICY memberships_update_organizer_only
ON public.flotte_adhesions
FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin()
  OR public.has_role(fleet_id, 'organizer'::public.role_type)
)
WITH CHECK (
  public.is_platform_admin()
  OR public.has_role(fleet_id, 'organizer'::public.role_type)
);

CREATE POLICY memberships_delete_organizer_only
ON public.flotte_adhesions
FOR DELETE
TO authenticated
USING (
  public.is_platform_admin()
  OR public.has_role(fleet_id, 'organizer'::public.role_type)
);

NOTIFY pgrst, 'reload schema';
COMMIT;
