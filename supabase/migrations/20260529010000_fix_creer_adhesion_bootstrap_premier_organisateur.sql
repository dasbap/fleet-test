-- Fix : cercle vicieux lors de la création du premier organisateur d'une flotte vide.
--
-- Problème : creer_ou_mettre_a_jour_adhesion_flotte appelait rbac_check_permission('member.update_role')
-- même quand la flotte n'avait encore AUCUN membre actif.
-- → rbac_check_permission retourne always {allowed: false} car l'user n'est pas encore organizer.
-- → Exception "Permission refusée : seul l'organisateur peut modifier les rôles."
-- → Création de flotte via /start (et onboarding) toujours bloquée.
--
-- Fix : introduire v_is_bootstrap = (user s'ajoute lui-même comme organizer sur flotte vide)
-- → exclure le check rbac_check_permission dans ce cas précis.

DROP FUNCTION IF EXISTS public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean);

CREATE FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(
  p_fleet_id uuid,
  p_user_id uuid,
  p_role public.role_type,
  p_is_active boolean
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

  -- Bootstrapping : premier organisateur d'une flotte vide (s'ajoute lui-même)
  v_is_bootstrap := (
    p_user_id = auth.uid()
    AND p_role = 'organizer'::public.role_type
    AND p_is_active = true
    AND NOT v_fleet_has_active_members
  );

  IF NOT (v_is_manager OR v_is_organizer) THEN
    IF NOT v_is_bootstrap THEN
      RAISE EXCEPTION 'Permission refusée : rôle manager/organizer requis pour modifier les adhésions.';
    END IF;
  END IF;

  -- Changement de rôle : organizer uniquement — SAUF bootstrapping (flotte vide)
  IF v_role_changing AND p_is_active AND NOT v_is_bootstrap THEN
    v_check := public.rbac_check_permission('member.update_role', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'Permission refusée : seul l''organisateur peut modifier les rôles.';
    END IF;
  END IF;

  -- Désactivation : manager ou organizer requis
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

GRANT EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
