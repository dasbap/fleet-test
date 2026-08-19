BEGIN;

-- 1) Admin/demo provisioning is backend-only. CREATE FUNCTION grants EXECUTE to
-- PUBLIC by default, so a service_role GRANT alone is not a restriction.
DO $$
BEGIN
  IF to_regprocedure('public.prospect_create_account(uuid,text,text,uuid,uuid,integer,text,boolean)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.prospect_create_account(uuid, text, text, uuid, uuid, integer, text, boolean) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.prospect_create_account(uuid, text, text, uuid, uuid, integer, text, boolean) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.prospect_create_account(uuid, text, text, uuid, uuid, integer, text, boolean) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.prospect_create_account(uuid, text, text, uuid, uuid, integer, text, boolean) TO service_role;
  END IF;
END $$;

-- 2) Invitation codes are secrets. Exact-code validation remains available via
-- valider_code_invitation(), but listing the table is restricted to fleet
-- invitation managers and platform admins.
DROP POLICY IF EXISTS invitations_lecture_publique ON public.flotte_invitations;
DROP POLICY IF EXISTS invitations_lecture_auth ON public.flotte_invitations;
DROP POLICY IF EXISTS invitations_select_manage_fleet ON public.flotte_invitations;
CREATE POLICY invitations_select_manage_fleet
ON public.flotte_invitations
FOR SELECT
TO authenticated
USING (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  OR public.has_role(fleet_id, 'manager'::public.role_type)
  OR public.is_platform_admin()
);

-- accepter_invitation requires auth.uid(), so anon execution serves no purpose.
REVOKE EXECUTE ON FUNCTION public.accepter_invitation(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accepter_invitation(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accepter_invitation(text) TO authenticated;

-- 3) A client must never be able to mutate a pending payment after the server
-- computed its price. Otherwise raw_payload/plan/vehicleCount can be changed
-- before a legitimate succeeded webhook is processed.
DROP POLICY IF EXISTS paiements_update_manager_org ON public.paiements;
REVOKE UPDATE ON TABLE public.paiements FROM authenticated;

-- 4) The generic membership RPC is never a fleet-ownership bootstrap. Onboarding
-- gets its own atomic creation path below. This also aligns member removal with
-- RBAC: managers may invite/reactivate, but only organizers may remove or change
-- an existing member's role.
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
    v_check := public.rbac_check_permission('member.invite', p_fleet_id);
    IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
      RAISE EXCEPTION 'Permission refusee : member.invite requis.';
    END IF;

    IF p_role = 'organizer'::public.role_type
       AND NOT public.has_role(p_fleet_id, 'organizer'::public.role_type)
       AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Permission refusee : promotion organizer interdite.';
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
    p_fleet_id, p_user_id, p_role, p_is_active
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_fleet_membership(uuid, uuid, public.role_type, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, public.role_type, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_fleet_membership(uuid, uuid, public.role_type, boolean) TO authenticated;

-- Atomic onboarding owns the only unaffiliated organizer bootstrap: the fleet and
-- first organizer membership are created in the same SECURITY DEFINER call.
CREATE OR REPLACE FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion(
  p_org_name text,
  p_country_code text,
  p_fleet_name text,
  p_collection_policy text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_fleet_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;
  IF nullif(trim(coalesce(p_org_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'nom_organisation_requis';
  END IF;
  IF nullif(trim(coalesce(p_fleet_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'nom_flotte_requis';
  END IF;
  IF length(trim(p_org_name)) > 200 OR length(trim(p_fleet_name)) > 200 THEN
    RAISE EXCEPTION 'nom_trop_long';
  END IF;

  INSERT INTO public.organisations (name, country_code)
  VALUES (trim(p_org_name), upper(trim(p_country_code)))
  RETURNING id INTO v_org_id;

  INSERT INTO public.flottes (org_id, name, collection_policy)
  VALUES (v_org_id, trim(p_fleet_name), trim(p_collection_policy))
  RETURNING id INTO v_fleet_id;

  INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (v_fleet_id, v_user_id, 'organizer'::public.role_type, true);

  RETURN jsonb_build_object('org_id', v_org_id, 'fleet_id', v_fleet_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion(text, text, text, text) TO authenticated;

-- 5) Legacy ESAMBA setup helpers previously bypassed tenant checks entirely.
-- The generic fleet/vehicle seed helpers are now platform-admin/service-only.
CREATE OR REPLACE FUNCTION public.creer_flotte_esamba(
  p_org_id uuid,
  p_name text,
  p_collection_policy text DEFAULT 'mix'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Permission refusee : admin plateforme requis.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organisations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Organisation introuvable.';
  END IF;

  SELECT id INTO v_fleet_id
    FROM public.flottes
   WHERE org_id = p_org_id AND name = p_name
   LIMIT 1;
  IF v_fleet_id IS NOT NULL THEN RETURN v_fleet_id; END IF;

  INSERT INTO public.flottes(org_id, name, collection_policy)
  VALUES (p_org_id, trim(p_name), trim(p_collection_policy))
  RETURNING id INTO v_fleet_id;
  RETURN v_fleet_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.creer_vehicule_esamba(
  p_fleet_id uuid,
  p_registration text,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_current_km integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Permission refusee : admin plateforme requis.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.flottes WHERE id = p_fleet_id) THEN
    RAISE EXCEPTION 'Flotte introuvable.';
  END IF;

  INSERT INTO public.vehicules(fleet_id, registration, brand, model, year, current_km, status)
  VALUES (
    p_fleet_id, upper(trim(p_registration)), nullif(trim(coalesce(p_brand,'')), ''),
    nullif(trim(coalesce(p_model,'')), ''), p_year, greatest(coalesce(p_current_km, 0), 0), 'ok'
  )
  ON CONFLICT (fleet_id, registration) DO UPDATE SET
    brand = COALESCE(EXCLUDED.brand, public.vehicules.brand),
    model = COALESCE(EXCLUDED.model, public.vehicules.model),
    year = COALESCE(EXCLUDED.year, public.vehicules.year),
    current_km = GREATEST(public.vehicules.current_km, EXCLUDED.current_km)
  RETURNING id INTO v_vehicle_id;
  RETURN v_vehicle_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.creer_flotte_esamba(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.creer_vehicule_esamba(uuid, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creer_flotte_esamba(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.creer_vehicule_esamba(uuid, text, text, text, integer, integer) TO service_role;

-- Keep invitation creation usable for fleet managers, but authorize inside the
-- SECURITY DEFINER function rather than trusting table RLS to protect it.
CREATE OR REPLACE FUNCTION public.creer_invitation_esamba(p_fleet_id uuid, p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_code text := upper(trim(p_code));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
  v_check := public.rbac_check_permission('member.invite', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'Permission refusee : member.invite requis.';
  END IF;
  IF length(v_code) < 10 OR length(v_code) > 64 THEN
    RAISE EXCEPTION 'code_invitation_longueur_invalide';
  END IF;

  INSERT INTO public.flotte_invitations(fleet_id, code, current_uses, created_by)
  VALUES (p_fleet_id, v_code, 0, auth.uid())
  ON CONFLICT (code) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.flotte_invitations
     WHERE fleet_id = p_fleet_id AND code = v_code
  ) THEN
    RAISE EXCEPTION 'code_invitation_deja_utilise';
  END IF;
  RETURN v_code;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.creer_invitation_esamba(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_invitation_esamba(uuid, text) TO authenticated;

-- 6) An inactive subscription is not generally a free subscription. The two
-- user-callable activation paths may activate inactive rows only when they are
-- an unexpired demo entitlement (no payment, trial_ends_at, active demo organizer).
CREATE OR REPLACE FUNCTION public.activate_fleet_subscription(p_subscription_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_check jsonb;
  v_demo_eligible boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;

  SELECT id, fleet_id, status, ends_at, payment_id, trial_ends_at
    INTO v_sub
    FROM public.abonnements
   WHERE id = p_subscription_id
   FOR UPDATE;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'abonnement_introuvable'; END IF;

  v_check := public.rbac_check_permission('billing.manage', v_sub.fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_abonnement';
  END IF;
  IF COALESCE(v_sub.ends_at, '9999-12-31 23:59:59+00'::timestamptz) <= now() THEN
    RAISE EXCEPTION 'abonnement_expire';
  END IF;
  IF v_sub.status IN ('active', 'trial') THEN
    RETURN jsonb_build_object('ok', true, 'subscription_id', p_subscription_id, 'status', v_sub.status);
  END IF;
  IF v_sub.status <> 'inactive' THEN RAISE EXCEPTION 'abonnement_activation_statut_invalide'; END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.demo_profiles dp
      JOIN public.flotte_adhesions fa ON fa.user_id = dp.user_id
     WHERE fa.fleet_id = v_sub.fleet_id
       AND fa.role = 'organizer'::public.role_type
       AND fa.is_active = true
       AND dp.is_active = true
       AND dp.demo_role = 'organizer'
       AND (dp.expires_at IS NULL OR dp.expires_at > now())
       AND v_sub.payment_id IS NULL
       AND v_sub.trial_ends_at IS NOT NULL
       AND v_sub.trial_ends_at > now()
  ) INTO v_demo_eligible;
  IF NOT v_demo_eligible THEN RAISE EXCEPTION 'abonnement_inactif_non_activable'; END IF;

  UPDATE public.abonnements SET status = 'active' WHERE id = p_subscription_id;
  RETURN jsonb_build_object('ok', true, 'subscription_id', p_subscription_id, 'status', 'active');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.activate_fleet_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_fleet_subscription(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_vehicle_with_subscription(
  p_fleet_id uuid,
  p_subscription_id uuid,
  p_registration text,
  p_brand text DEFAULT null,
  p_model text DEFAULT null,
  p_year integer DEFAULT null,
  p_current_km integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_target record;
  v_vehicle public.vehicules%rowtype;
  v_demo_eligible boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
  IF p_fleet_id IS NULL THEN RAISE EXCEPTION 'fleet_id_required'; END IF;
  IF p_subscription_id IS NULL THEN RAISE EXCEPTION 'subscription_id_required'; END IF;
  IF nullif(trim(coalesce(p_registration, '')), '') IS NULL THEN RAISE EXCEPTION 'registration_required'; END IF;

  v_check := public.rbac_check_permission('vehicle.create', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_vehicle_create';
  END IF;

  SELECT a.id, a.fleet_id, a.status, a.ends_at, a.payment_id, a.trial_ends_at
    INTO v_target
    FROM public.abonnements a
   WHERE a.id = p_subscription_id
   FOR UPDATE;
  IF v_target.id IS NULL THEN RAISE EXCEPTION 'abonnement_introuvable'; END IF;
  IF v_target.fleet_id IS DISTINCT FROM p_fleet_id THEN RAISE EXCEPTION 'abonnement_flotte_incompatible'; END IF;

  IF v_target.status = 'inactive' THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.demo_profiles dp
        JOIN public.flotte_adhesions fa ON fa.user_id = dp.user_id
       WHERE fa.fleet_id = p_fleet_id
         AND fa.role = 'organizer'::public.role_type
         AND fa.is_active = true
         AND dp.is_active = true
         AND dp.demo_role = 'organizer'
         AND (dp.expires_at IS NULL OR dp.expires_at > now())
         AND v_target.payment_id IS NULL
         AND v_target.trial_ends_at IS NOT NULL
         AND v_target.trial_ends_at > now()
    ) INTO v_demo_eligible;
    IF NOT v_demo_eligible THEN RAISE EXCEPTION 'abonnement_inactif_non_activable'; END IF;
    UPDATE public.abonnements SET status = 'active' WHERE id = p_subscription_id;
    v_target.status := 'active';
  END IF;

  IF NOT public.is_vehicle_subscription_status_active(v_target.status) THEN
    RAISE EXCEPTION 'abonnement_inactif';
  END IF;
  IF COALESCE(v_target.ends_at, '9999-12-31 23:59:59+00'::timestamptz) <= now() THEN
    RAISE EXCEPTION 'abonnement_expire';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_fleet_id::text, 2026081012));
  IF NOT public.can_create_vehicle(p_fleet_id) THEN
    RAISE EXCEPTION 'limite_vehicules_abonnement_atteinte';
  END IF;

  INSERT INTO public.vehicules(fleet_id, registration, brand, model, year, current_km, status)
  VALUES (
    p_fleet_id, upper(trim(p_registration)), nullif(trim(coalesce(p_brand,'')), ''),
    nullif(trim(coalesce(p_model,'')), ''), p_year, greatest(coalesce(p_current_km, 0), 0), 'ok'
  )
  RETURNING * INTO v_vehicle;

  PERFORM public.assign_vehicle_to_subscription(v_vehicle.id, p_subscription_id, auth.uid());
  RETURN to_jsonb(v_vehicle);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_vehicle_with_subscription(uuid, uuid, text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_vehicle_with_subscription(uuid, uuid, text, text, text, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
