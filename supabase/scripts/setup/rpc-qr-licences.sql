-- =====================================================
-- RPC QR / Licences - E-Samba
-- Smart Fleet Africa
-- =====================================================
-- Ce fichier définit trois fonctions principales :
-- - generer_qr(...)   : génère un jeton_qr (véhicule ou lot)
-- - analyser_qr(...)  : analyse un payload QR et retourne un aperçu JSON
-- - appliquer_qr(...) : applique les effets métier (activation / prolongation)
-- 
-- Ces fonctions sont conçues pour être appelées côté frontend via Supabase RPC.
-- Elles reposent sur les tables :
-- - abonnements, droits_vehicules, jetons_qr, journal_scans_qr, blocages_discipline
-- et la fonction has_role(...) déjà définie.
-- =====================================================

-- -----------------------------------------------------
-- 1) Génération de QR
-- -----------------------------------------------------

DROP FUNCTION IF EXISTS public.generer_qr(
  text,
  uuid,
  uuid[],
  uuid,
  int,
  boolean
);

CREATE OR REPLACE FUNCTION public.generer_qr(
  p_type text,                 -- 'vehicle' | 'lot'
  p_fleet_id uuid,             -- flotte cible (obligatoire pour lot)
  p_vehicle_ids uuid[],        -- liste de véhicules (vehicle_ids ou pour lot)
  p_subscription_id uuid,      -- abonnement lié
  p_validite_minutes int,      -- durée de validité
  p_premium boolean DEFAULT false -- indicateur Premium (optionnel)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_expires_at timestamptz;
  v_token_id uuid;
  v_token_hash text;
  v_license_ids uuid[];
  v_row droits_vehicules%ROWTYPE;
BEGIN
  IF p_type NOT IN ('vehicle', 'lot') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_type');
  END IF;

  IF p_validite_minutes IS NULL OR p_validite_minutes <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_duration');
  END IF;

  v_expires_at := v_now + (p_validite_minutes || ' minutes')::interval;

  -- Vérification des droits : manager / organizer
  IF p_type = 'vehicle' THEN
    IF p_vehicle_ids IS NULL OR array_length(p_vehicle_ids, 1) <> 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'vehicle_type_requires_single_vehicle');
    END IF;

    PERFORM 1
    FROM vehicules v
    WHERE v.id = p_vehicle_ids[1]
      AND (has_role(v.fleet_id, 'manager') OR has_role(v.fleet_id, 'organizer'));

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
    END IF;
  ELSE
    -- lot
    IF p_fleet_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'fleet_required_for_lot');
    END IF;

    IF NOT (has_role(p_fleet_id, 'manager') OR has_role(p_fleet_id, 'organizer')) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
    END IF;
  END IF;

  -- Récupérer les licences couvertes (droits_vehicules) pour l'abonnement
  IF p_vehicle_ids IS NOT NULL THEN
    SELECT array_agg(dv.id)
    INTO v_license_ids
    FROM droits_vehicules dv
    WHERE dv.subscription_id = p_subscription_id
      AND dv.vehicle_id = ANY(p_vehicle_ids);
  END IF;

  IF v_license_ids IS NULL OR array_length(v_license_ids, 1) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_matching_licenses');
  END IF;

  -- Générer un hash opaque pour le QR
  v_token_id := gen_random_uuid();
  v_token_hash := encode(digest(v_token_id::text || ':' || v_now::text, 'sha256'), 'hex');

  INSERT INTO jetons_qr (
    id,
    vehicle_id,
    token_hash,
    scope,
    expires_at,
    created_by,
    created_at,
    type,
    fleet_id,
    subscription_id,
    license_ids,
    action,
    max_uses,
    used_count
  )
  VALUES (
    v_token_id,
    CASE WHEN p_type = 'vehicle' THEN p_vehicle_ids[1] ELSE NULL END,
    v_token_hash,
    'subscription',
    v_expires_at,
    auth.uid(),
    v_now,
    p_type,
    CASE WHEN p_type = 'lot' THEN p_fleet_id ELSE NULL END,
    p_subscription_id,
    v_license_ids,
    'activate',
    CASE WHEN p_type = 'vehicle' THEN 1 ELSE 1 END,
    0
  );

  RETURN jsonb_build_object(
    'ok', true,
    'error', null,
    'qr_token_id', v_token_id,
    'qr_payload', format('esamba://qr/%s?sig=%s', v_token_id::text, v_token_hash),
    'expires_at', v_expires_at,
    'licenses', v_license_ids,
    'type', p_type,
    'premium', p_premium
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generer_qr(
  text,
  uuid,
  uuid[],
  uuid,
  int,
  boolean
) TO authenticated;

-- -----------------------------------------------------
-- 2) Analyse d'un payload QR
-- -----------------------------------------------------

DROP FUNCTION IF EXISTS public.analyser_qr(text);

CREATE OR REPLACE FUNCTION public.analyser_qr(
  p_payload text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_id uuid;
  v_sig text;
  v_token jetons_qr%ROWTYPE;
  v_now timestamptz := now();
  v_expected_hash text;
  v_licenses RECORD;
  v_has_discipline_block boolean := false;
BEGIN
  IF p_payload IS NULL OR position('esamba://qr/' IN p_payload) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_payload');
  END IF;

  -- Extraction naïve de l'ID et de la signature depuis l'URL
  -- Format attendu : esamba://qr/<uuid>?sig=<hash>
  BEGIN
    v_token_id := split_part(split_part(p_payload, 'esamba://qr/', 2), '?', 1)::uuid;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token_id');
  END;

  v_sig := NULLIF(split_part(p_payload, 'sig=', 2), '');

  SELECT * INTO v_token
  FROM jetons_qr
  WHERE id = v_token_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_not_found');
  END IF;

  -- Recalcule du hash attendu (simple, basé sur id + created_at)
  v_expected_hash := encode(digest(v_token.id::text || ':' || v_token.created_at::text, 'sha256'), 'hex');

  IF v_token.token_hash IS NOT NULL AND v_token.token_hash <> v_expected_hash THEN
    -- Si le token existant utilise un autre schéma, on vérifie au moins la signature fournie
    IF v_sig IS NOT NULL AND v_sig <> v_token.token_hash THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_signature');
    END IF;
  END IF;

  -- Vérifier expiration et nombre d'utilisations
  IF v_token.expires_at < v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_token.max_uses IS NOT NULL AND v_token.used_count >= v_token.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses_reached');
  END IF;

  -- Vérifier les droits de rôle
  IF v_token.type = 'vehicle' THEN
    PERFORM 1
    FROM vehicules v
    WHERE v.id = v_token.vehicle_id
      AND (has_role(v.fleet_id, 'manager') OR has_role(v.fleet_id, 'organizer'));

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
    END IF;
  ELSIF v_token.type = 'lot' THEN
    IF v_token.fleet_id IS NULL OR NOT (has_role(v_token.fleet_id, 'manager') OR has_role(v_token.fleet_id, 'organizer')) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
    END IF;
  END IF;

  -- Vérifier blocages disciplinaires actifs sur au moins un véhicule concerné
  IF v_token.type = 'vehicle' AND v_token.vehicle_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM blocages_discipline b
      WHERE b.vehicle_id = v_token.vehicle_id
        AND b.status = 'active'
    )
    INTO v_has_discipline_block;
  ELSIF v_token.type = 'lot' AND v_token.license_ids IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM blocages_discipline b
      JOIN droits_vehicules dv ON dv.vehicle_id = b.vehicle_id
      WHERE dv.id = ANY(v_token.license_ids)
        AND b.status = 'active'
    )
    INTO v_has_discipline_block;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'error', null,
    'qr_token_id', v_token.id,
    'type', v_token.type,
    'expires_at', v_token.expires_at,
    'max_uses', v_token.max_uses,
    'used_count', v_token.used_count,
    'can_apply', NOT v_has_discipline_block,
    'discipline_hold', v_has_discipline_block,
    'license_ids', v_token.license_ids
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.analyser_qr(text) TO authenticated;

-- -----------------------------------------------------
-- 3) Application d'un QR (activation / prolongation)
-- -----------------------------------------------------

DROP FUNCTION IF EXISTS public.appliquer_qr(uuid);

CREATE OR REPLACE FUNCTION public.appliquer_qr(
  p_qr_token_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token jetons_qr%ROWTYPE;
  v_now timestamptz := now();
  v_has_discipline_block boolean := false;
  v_updated_count int := 0;
  v_user_id uuid := auth.uid();
BEGIN
  IF p_qr_token_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_token_id');
  END IF;

  SELECT * INTO v_token
  FROM jetons_qr
  WHERE id = p_qr_token_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_not_found');
  END IF;

  IF v_token.expires_at < v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_token.max_uses IS NOT NULL AND v_token.used_count >= v_token.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses_reached');
  END IF;

  -- Vérifier blocages disciplinaires
  IF v_token.type = 'vehicle' AND v_token.vehicle_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM blocages_discipline b
      WHERE b.vehicle_id = v_token.vehicle_id
        AND b.status = 'active'
    )
    INTO v_has_discipline_block;
  ELSIF v_token.type = 'lot' AND v_token.license_ids IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM blocages_discipline b
      JOIN droits_vehicules dv ON dv.vehicle_id = b.vehicle_id
      WHERE dv.id = ANY(v_token.license_ids)
        AND b.status = 'active'
    )
    INTO v_has_discipline_block;
  END IF;

  IF v_has_discipline_block THEN
    INSERT INTO journal_scans_qr (
      qr_token_id,
      scanned_by_user_id,
      scanned_by_role,
      result,
      details
    )
    VALUES (
      v_token.id,
      v_user_id,
      NULL,
      'discipline_hold',
      jsonb_build_object('reason', 'discipline_block_active')
    );

    RETURN jsonb_build_object('ok', false, 'error', 'discipline_hold');
  END IF;

  -- Mettre à jour les licences concernées (status = active)
  IF v_token.license_ids IS NOT NULL THEN
    UPDATE droits_vehicules dv
    SET status = 'active'
    WHERE dv.id = ANY(v_token.license_ids);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  -- Incrémenter l'utilisation du jeton
  UPDATE jetons_qr
  SET used_count = used_count + 1
  WHERE id = v_token.id;

  INSERT INTO journal_scans_qr (
    qr_token_id,
    scanned_by_user_id,
    scanned_by_role,
    result,
    details
  )
  VALUES (
    v_token.id,
    v_user_id,
    NULL,
    'success',
    jsonb_build_object('updated_licenses', v_updated_count)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'error', null,
    'updated_licenses', v_updated_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.appliquer_qr(uuid) TO authenticated;

-- =====================================================
-- Fin fichier RPC QR / Licences
-- =====================================================

