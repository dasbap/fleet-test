-- =====================================================
-- Snapshot session pour aiguillage post-login (une seule vérité métier côté TS).
-- Nom distinct de tout futur RPC « enrichi » (profil, liste flottes) que pourrait
-- consommer useSessionContext sous le nom get_user_session_context.
--
-- Aligné sur AuthFlowComputeInput + computeAuthFlowDecision (src/lib/auth-flow.ts)
-- et sur computeLapsedPaidFromLatestSubscription (src/services/billing.service.ts).
-- =====================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_auth_flow_session_snapshot(p_preferred_fleet_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_created timestamptz;
  v_last_sign_in timestamptz;
  v_active_fleet uuid;
  v_role public.role_type;
  v_org_id uuid;
  v_onboarding boolean;
  v_lapsed boolean := false;
  v_has_memberships boolean;
  v_latest_status text;
  v_latest_starts timestamptz;
  v_latest_ends timestamptz;
  v_latest_plan text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT u.created_at, u.last_sign_in_at
  INTO v_user_created, v_last_sign_in
  FROM auth.users u
  WHERE u.id = v_uid;

  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.user_id = v_uid
      AND fa.is_active = true
  )
  INTO v_has_memberships;

  IF NOT v_has_memberships THEN
    RETURN jsonb_build_object(
      'has_memberships', false,
      'user_created_at', v_user_created,
      'last_sign_in_at', v_last_sign_in,
      'onboarding_completed', true,
      'lapsed_paid', false,
      'role', null,
      'active_fleet_id', null,
      'org_id', null
    );
  END IF;

  -- Flotte active : préférence client (localStorage) si adhésion valide, sinon même défaut que FleetMemberRepository (created_at desc + dédup par flotte).
  SELECT d.fleet_id, d.role
  INTO v_active_fleet, v_role
  FROM (
    SELECT DISTINCT ON (fa.fleet_id)
      fa.fleet_id,
      fa.role,
      fa.created_at
    FROM public.flotte_adhesions fa
    WHERE fa.user_id = v_uid
      AND fa.is_active = true
    ORDER BY fa.fleet_id, fa.created_at DESC
  ) d
  WHERE p_preferred_fleet_id IS NOT NULL
    AND d.fleet_id = p_preferred_fleet_id;

  IF v_active_fleet IS NULL THEN
    SELECT d.fleet_id, d.role
    INTO v_active_fleet, v_role
    FROM (
      SELECT DISTINCT ON (fa.fleet_id)
        fa.fleet_id,
        fa.role,
        fa.created_at
      FROM public.flotte_adhesions fa
      WHERE fa.user_id = v_uid
        AND fa.is_active = true
      ORDER BY fa.fleet_id, fa.created_at DESC
    ) d
    ORDER BY d.created_at DESC
    LIMIT 1;
  END IF;

  SELECT f.org_id
  INTO v_org_id
  FROM public.flottes f
  WHERE f.id = v_active_fleet;

  SELECT op.completed
  INTO v_onboarding
  FROM public.onboarding_progress op
  WHERE op.org_id = v_org_id
    AND op.user_id = v_uid
  ORDER BY op.updated_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    v_onboarding := false;
  END IF;

  -- Parité avec computeLapsedPaidFromLatestSubscription (dernier abonnement par fin).
  SELECT a.status, a.starts_at, a.ends_at, p.code
  INTO v_latest_status, v_latest_starts, v_latest_ends, v_latest_plan
  FROM public.abonnements a
  INNER JOIN public.plans p ON p.id = a.plan_id
  WHERE a.fleet_id = v_active_fleet
  ORDER BY a.ends_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF COALESCE(v_latest_plan, 'free') = 'free' THEN
      v_lapsed := false;
    ELSIF v_latest_status IS DISTINCT FROM 'active' THEN
      v_lapsed := true;
    ELSIF v_latest_ends < now() THEN
      v_lapsed := true;
    ELSIF v_latest_starts > now() THEN
      v_lapsed := true;
    ELSE
      v_lapsed := false;
    END IF;
  ELSE
    v_lapsed := false;
  END IF;

  RETURN jsonb_build_object(
    'has_memberships', true,
    'user_created_at', v_user_created,
    'last_sign_in_at', v_last_sign_in,
    'onboarding_completed', v_onboarding,
    'lapsed_paid', v_lapsed,
    'role', v_role::text,
    'active_fleet_id', v_active_fleet,
    'org_id', v_org_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_flow_session_snapshot(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_auth_flow_session_snapshot(uuid) IS
  'Données pour computeAuthFlowDecision (auth-flow.ts). Décision de route côté client. '
  'lapsed_paid aligné sur computeLapsedPaidFromLatestSubscription (billing.service.ts).';

COMMIT;
