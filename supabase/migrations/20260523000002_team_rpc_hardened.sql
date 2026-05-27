-- RPC équipe durcis : liste membres, changement de rôle (organizer), invitations.

-- ── Liste membres enrichie ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_fleet_members(p_fleet_id uuid)
RETURNS TABLE (
  id          uuid,
  user_id     uuid,
  fleet_id    uuid,
  role        public.role_type,
  is_active   boolean,
  created_at  timestamptz,
  full_name   text,
  phone       text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur non authentifié.';
  END IF;

  v_check := public.rbac_check_permission('member.view', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'Permission refusée : member.view requis.';
  END IF;

  RETURN QUERY
  SELECT
    fa.id,
    fa.user_id,
    fa.fleet_id,
    fa.role,
    fa.is_active,
    fa.created_at,
    p.full_name,
    p.phone
  FROM public.flotte_adhesions fa
  LEFT JOIN public.profils p ON p.user_id = fa.user_id
  WHERE fa.fleet_id = p_fleet_id
  ORDER BY fa.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_fleet_members(uuid) TO authenticated;

-- ── Changement de rôle (organizer uniquement) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_fleet_member_role(
  p_adhesion_id uuid,
  p_role        public.role_type
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_id   uuid;
  v_user_id    uuid;
  v_old_role   public.role_type;
  v_check      jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur non authentifié.';
  END IF;

  SELECT fa.fleet_id, fa.user_id, fa.role
  INTO v_fleet_id, v_user_id, v_old_role
  FROM public.flotte_adhesions fa
  WHERE fa.id = p_adhesion_id;

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Adhésion introuvable.';
  END IF;

  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Vous ne pouvez pas modifier votre propre rôle.';
  END IF;

  v_check := public.rbac_check_permission('member.update_role', v_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'Permission refusée : seul l''organisateur peut modifier les rôles.';
  END IF;

  -- Anti-élévation : un non-admin ne peut pas promouvoir en organizer
  IF p_role = 'organizer'::public.role_type
     AND NOT public.is_platform_admin()
     AND NOT public.has_role(v_fleet_id, 'organizer'::public.role_type) THEN
    RAISE EXCEPTION 'Permission refusée : promotion organizer interdite.';
  END IF;

  RETURN public.creer_ou_mettre_a_jour_adhesion_flotte(
    v_fleet_id,
    v_user_id,
    p_role,
    true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_fleet_member_role(uuid, public.role_type) TO authenticated;

-- ── Liste invitations actives ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_fleet_invitations(p_fleet_id uuid)
RETURNS SETOF public.flotte_invitations
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur non authentifié.';
  END IF;

  v_check := public.rbac_check_permission('member.invite', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'Permission refusée : member.invite requis.';
  END IF;

  RETURN QUERY
  SELECT fi.*
  FROM public.flotte_invitations fi
  WHERE fi.fleet_id = p_fleet_id
    AND (fi.expires_at IS NULL OR fi.expires_at > now())
  ORDER BY fi.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_fleet_invitations(uuid) TO authenticated;

-- ── Durcir creer_ou_mettre_a_jour : changement de rôle = organizer only ───────
CREATE OR REPLACE FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(
  p_fleet_id uuid,
  p_user_id uuid,
  p_role role_type,
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur non authentifié.';
  END IF;

  SELECT fa.role INTO v_existing_role
  FROM public.flotte_adhesions fa
  WHERE fa.fleet_id = p_fleet_id
    AND fa.user_id = p_user_id
    AND fa.role = p_role
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

  IF NOT (v_is_manager OR v_is_organizer) THEN
    IF NOT (
      p_user_id = auth.uid()
      AND p_role = 'organizer'::public.role_type
      AND p_is_active = true
      AND NOT v_fleet_has_active_members
    ) THEN
      RAISE EXCEPTION 'Permission refusée : rôle manager/organizer requis pour modifier les adhésions.';
    END IF;
  END IF;

  -- Changement de rôle : organizer uniquement (aligné member.update_role)
  IF v_role_changing AND p_is_active THEN
    v_check := public.rbac_check_permission('member.update_role', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'Permission refusée : seul l''organisateur peut modifier les rôles.';
    END IF;
  END IF;

  -- Activation/désactivation sans changement de rôle : manager ou organizer
  IF NOT p_is_active AND NOT (v_is_manager OR v_is_organizer OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'Permission refusée : impossible de désactiver ce membre.';
  END IF;

  INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (p_fleet_id, p_user_id, p_role, p_is_active)
  ON CONFLICT (fleet_id, user_id, role)
  DO UPDATE SET
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

COMMENT ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, role_type, boolean) IS
  'Upsert adhésion : changement de rôle réservé à l''organisateur (member.update_role).';
