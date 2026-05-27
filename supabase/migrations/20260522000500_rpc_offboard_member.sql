-- RPC offboard_member(p_user_id, p_fleet_id)
-- Désactive tous les rôles actifs d'un utilisateur dans une flotte.
-- Insère un audit_log. Organizer ou admin uniquement.

CREATE OR REPLACE FUNCTION public.offboard_member(
  p_user_id  uuid,
  p_fleet_id uuid DEFAULT NULL  -- si NULL, utilise la flotte de l'appelant
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_fleet_id   uuid;
  v_rows_count int;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur non authentifié.';
  END IF;

  -- Résoudre fleet_id
  v_fleet_id := COALESCE(
    p_fleet_id,
    (
      SELECT fa.fleet_id
      FROM public.flotte_adhesions fa
      WHERE fa.user_id = v_caller_id
        AND fa.is_active = true
      LIMIT 1
    )
  );

  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Flotte introuvable pour cet utilisateur.';
  END IF;

  -- Vérification droits de l'appelant
  IF NOT (
    public.has_role(v_fleet_id, 'organizer'::public.role_type)
    OR EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      WHERE ap.user_id = v_caller_id AND ap.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Permission refusée : rôle organizer ou admin requis.';
  END IF;

  -- Empêcher auto-offboarding
  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas vous retirer vous-même de la flotte.';
  END IF;

  -- Désactiver tous les rôles actifs du membre dans cette flotte
  UPDATE public.flotte_adhesions
  SET is_active = false
  WHERE fleet_id = v_fleet_id
    AND user_id  = p_user_id
    AND is_active = true;

  GET DIAGNOSTICS v_rows_count = ROW_COUNT;

  -- Audit log global (les triggers individuels loguent chaque row)
  IF v_rows_count > 0 THEN
    INSERT INTO public.audit_logs (actor_id, action, target_id, fleet_id, metadata, created_at)
    VALUES (
      v_caller_id,
      'member.offboarded',
      p_user_id,
      v_fleet_id,
      jsonb_build_object(
        'fleet_id',          v_fleet_id,
        'offboarded_user_id', p_user_id,
        'roles_deactivated', v_rows_count
      ),
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',               true,
    'fleet_id',         v_fleet_id,
    'user_id',          p_user_id,
    'roles_deactivated', v_rows_count
  );
END;
$$;

COMMENT ON FUNCTION public.offboard_member(uuid, uuid) IS
  'Désactive tous les rôles d''un membre dans une flotte. Organizer ou admin uniquement.';
