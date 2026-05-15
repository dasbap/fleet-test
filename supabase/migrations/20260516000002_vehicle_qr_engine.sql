-- ============================================================
-- Moteur QR véhicules E-Samba
-- Extension de jetons_qr + journal_scans_qr
-- Fonctions RPC scan/activation QR
-- ============================================================

-- ─── 1. Extension jetons_qr ─────────────────────────────────

DO $$ BEGIN
  -- code : token lisible encodé dans le QR (distinct du token_hash interne)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'code') THEN
    ALTER TABLE public.jetons_qr ADD COLUMN code text NULL;
    -- Remplit les existants si vide
    UPDATE public.jetons_qr SET code = token_hash WHERE code IS NULL;
    ALTER TABLE public.jetons_qr ALTER COLUMN code SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS jetons_qr_code_unique ON public.jetons_qr (code);
  END IF;

  -- vehicle_ids : tableau pour QR lot de véhicules
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'vehicle_ids') THEN
    ALTER TABLE public.jetons_qr ADD COLUMN vehicle_ids uuid[] NULL;
  END IF;

  -- status : pending | active | used | expired | revoked
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'status') THEN
    ALTER TABLE public.jetons_qr ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;

  -- activated_at : première activation réussie
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'activated_at') THEN
    ALTER TABLE public.jetons_qr ADD COLUMN activated_at timestamptz NULL;
  END IF;

  -- revoked_at + revoked_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jetons_qr' AND column_name = 'revoked_at') THEN
    ALTER TABLE public.jetons_qr ADD COLUMN revoked_at timestamptz NULL;
    ALTER TABLE public.jetons_qr ADD COLUMN revoked_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Contrainte CHECK sur status
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jetons_qr_status_check' AND conrelid = 'public.jetons_qr'::regclass
  ) THEN
    ALTER TABLE public.jetons_qr ADD CONSTRAINT jetons_qr_status_check
      CHECK (status IN ('pending','active','used','expired','revoked'));
  END IF;
END $$;

-- Index pour lookup par code (scan rapide)
CREATE INDEX IF NOT EXISTS jetons_qr_code_idx   ON public.jetons_qr (code);
CREATE INDEX IF NOT EXISTS jetons_qr_fleet_idx  ON public.jetons_qr (fleet_id) WHERE fleet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS jetons_qr_vehicle_idx ON public.jetons_qr (vehicle_id) WHERE vehicle_id IS NOT NULL;

-- ─── 2. Extension journal_scans_qr ──────────────────────────

DO $$ BEGIN
  -- status : success | rejected | expired | exceeded
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'journal_scans_qr' AND column_name = 'status') THEN
    ALTER TABLE public.journal_scans_qr ADD COLUMN status text NOT NULL DEFAULT 'success';
  END IF;

  -- reject_reason : motif de rejet lisible
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'journal_scans_qr' AND column_name = 'reject_reason') THEN
    ALTER TABLE public.journal_scans_qr ADD COLUMN reject_reason text NULL;
  END IF;

  -- vehicle_id : véhicule concerné par le scan
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'journal_scans_qr' AND column_name = 'vehicle_id') THEN
    ALTER TABLE public.journal_scans_qr ADD COLUMN vehicle_id uuid NULL REFERENCES public.vehicules(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS journal_scans_qr_status_idx
  ON public.journal_scans_qr (status, scanned_at DESC);

-- ─── 3. RPC : qr_generate_vehicle ───────────────────────────
-- Génère un QR d'activation pour un véhicule unique.
CREATE OR REPLACE FUNCTION public.qr_generate_vehicle(
  p_vehicle_id      uuid,
  p_subscription_id uuid,
  p_created_by      uuid,
  p_expires_hours   integer DEFAULT 24,
  p_max_uses        integer DEFAULT 1
)
RETURNS TABLE (qr_id uuid, code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_id   uuid;
  v_code       text;
  v_qr_id      uuid;
  v_expires_at timestamptz;
BEGIN
  -- Vérifie que le véhicule existe et appartient à la bonne flotte
  SELECT fleet_id INTO v_fleet_id FROM vehicules WHERE id = p_vehicle_id;
  IF v_fleet_id IS NULL THEN
    RAISE EXCEPTION 'Véhicule introuvable : %', p_vehicle_id;
  END IF;

  -- Vérifie pas de blocage disciplinaire actif
  IF EXISTS (
    SELECT 1 FROM blocages_discipline
    WHERE vehicle_id = p_vehicle_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'BLOCKED_DISCIPLINE: Le véhicule a un blocage disciplinaire actif';
  END IF;

  v_code       := 'ESQR-' || upper(encode(gen_random_bytes(12), 'hex'));
  v_expires_at := now() + (p_expires_hours || ' hours')::interval;

  INSERT INTO jetons_qr (
    fleet_id, vehicle_id, subscription_id, type, code, token_hash,
    scope, action, max_uses, used_count, status, expires_at, created_by
  )
  VALUES (
    v_fleet_id, p_vehicle_id, p_subscription_id, 'vehicle', v_code, v_code,
    'subscription', 'activate', p_max_uses, 0, 'active', v_expires_at, p_created_by
  )
  RETURNING id INTO v_qr_id;

  RETURN QUERY SELECT v_qr_id, v_code, v_expires_at;
END;
$$;

-- ─── 4. RPC : qr_generate_fleet_lot ────────────────────────
-- Génère un QR d'activation pour un lot de véhicules.
CREATE OR REPLACE FUNCTION public.qr_generate_fleet_lot(
  p_fleet_id        uuid,
  p_vehicle_ids     uuid[],
  p_subscription_id uuid,
  p_created_by      uuid,
  p_expires_hours   integer DEFAULT 48
)
RETURNS TABLE (qr_id uuid, code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code       text;
  v_qr_id      uuid;
  v_expires_at timestamptz;
BEGIN
  IF array_length(p_vehicle_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Au moins un véhicule requis pour un QR lot';
  END IF;

  v_code       := 'ESQRL-' || upper(encode(gen_random_bytes(12), 'hex'));
  v_expires_at := now() + (p_expires_hours || ' hours')::interval;

  INSERT INTO jetons_qr (
    fleet_id, vehicle_id, vehicle_ids, subscription_id, type, code, token_hash,
    scope, action, max_uses, used_count, status, expires_at, created_by
  )
  VALUES (
    p_fleet_id, NULL, p_vehicle_ids, p_subscription_id, 'lot', v_code, v_code,
    'subscription', 'activate', 1, 0, 'active', v_expires_at, p_created_by
  )
  RETURNING id INTO v_qr_id;

  RETURN QUERY SELECT v_qr_id, v_code, v_expires_at;
END;
$$;

-- ─── 5. RPC : qr_scan_activation ────────────────────────────
-- Valide et applique un scan QR d'activation véhicule.
-- Retourne le résultat du scan : success | rejected (+ motif).
CREATE OR REPLACE FUNCTION public.qr_scan_activation(
  p_code       text,
  p_scanner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr          record;
  v_sub         record;
  v_vehicle_ids uuid[];
  v_vid         uuid;
  v_result      text;
  v_reason      text;
  v_now         timestamptz := now();
BEGIN
  -- 1. Lookup QR par code
  SELECT * INTO v_qr FROM jetons_qr WHERE code = p_code LIMIT 1;

  IF v_qr.id IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'QR_NOT_FOUND', 'message', 'QR code inconnu');
  END IF;

  -- 2. Vérification expiry
  IF v_qr.expires_at < v_now THEN
    UPDATE jetons_qr SET status = 'expired' WHERE id = v_qr.id;
    INSERT INTO journal_scans_qr (qr_token_id, scanned_by_user_id, result, status, reject_reason)
    VALUES (v_qr.id, p_scanner_id, 'rejected', 'expired', 'QR expiré');
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'QR_EXPIRED', 'message', 'Ce QR a expiré');
  END IF;

  -- 3. Vérification usage
  IF v_qr.used_count >= v_qr.max_uses THEN
    UPDATE jetons_qr SET status = 'used' WHERE id = v_qr.id;
    INSERT INTO journal_scans_qr (qr_token_id, scanned_by_user_id, result, status, reject_reason)
    VALUES (v_qr.id, p_scanner_id, 'rejected', 'exceeded', 'Nombre max d''utilisations atteint');
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'QR_EXHAUSTED', 'message', 'Ce QR a déjà été utilisé');
  END IF;

  -- 4. Vérification statut QR
  IF v_qr.status NOT IN ('active', 'pending') THEN
    INSERT INTO journal_scans_qr (qr_token_id, scanned_by_user_id, result, status, reject_reason)
    VALUES (v_qr.id, p_scanner_id, 'rejected', 'rejected', 'Statut QR invalide : ' || v_qr.status);
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'QR_INVALID_STATUS', 'message', 'QR révoqué ou invalide');
  END IF;

  -- 5. Vérification abonnement source
  IF v_qr.subscription_id IS NOT NULL THEN
    SELECT status INTO v_sub FROM abonnements WHERE id = v_qr.subscription_id;
    IF v_sub.status NOT IN ('active', 'trial', 'grace_period') THEN
      INSERT INTO journal_scans_qr (qr_token_id, scanned_by_user_id, result, status, reject_reason)
      VALUES (v_qr.id, p_scanner_id, 'rejected', 'rejected', 'Abonnement source inactif : ' || v_sub.status);
      RETURN jsonb_build_object('status', 'rejected', 'reason', 'SUBSCRIPTION_INACTIVE',
        'message', 'L''abonnement associé n''est plus actif');
    END IF;
  END IF;

  -- 6. Collecte des véhicules à activer
  IF v_qr.type = 'lot' AND v_qr.vehicle_ids IS NOT NULL THEN
    v_vehicle_ids := v_qr.vehicle_ids;
  ELSIF v_qr.vehicle_id IS NOT NULL THEN
    v_vehicle_ids := ARRAY[v_qr.vehicle_id];
  ELSE
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'NO_VEHICLE', 'message', 'QR sans véhicule associé');
  END IF;

  -- 7. Vérif blocages disciplinaires pour chaque véhicule
  FOREACH v_vid IN ARRAY v_vehicle_ids LOOP
    IF EXISTS (SELECT 1 FROM blocages_discipline WHERE vehicle_id = v_vid AND status = 'active') THEN
      INSERT INTO journal_scans_qr (qr_token_id, scanned_by_user_id, vehicle_id, result, status, reject_reason)
      VALUES (v_qr.id, p_scanner_id, v_vid, 'rejected', 'rejected', 'Blocage disciplinaire actif');
      RETURN jsonb_build_object('status', 'rejected', 'reason', 'BLOCKED_DISCIPLINE',
        'message', 'Un ou plusieurs véhicules ont un blocage disciplinaire actif — le QR ne peut pas le lever');
    END IF;
  END LOOP;

  -- 8. Activation des droits véhicules
  FOREACH v_vid IN ARRAY v_vehicle_ids LOOP
    UPDATE public.droits_vehicules
    SET active = true,
        status = 'active'
    WHERE vehicle_id = v_vid
      AND (subscription_id = v_qr.subscription_id OR subscription_id IN (
        SELECT id FROM abonnements WHERE fleet_id = v_qr.fleet_id AND status = 'active'
      ));

    -- Log scan réussi par véhicule
    INSERT INTO journal_scans_qr (qr_token_id, scanned_by_user_id, vehicle_id, result, status)
    VALUES (v_qr.id, p_scanner_id, v_vid, 'success', 'success');
  END LOOP;

  -- 9. Mise à jour compteur QR
  UPDATE jetons_qr
  SET used_count    = used_count + 1,
      activated_at  = COALESCE(activated_at, v_now),
      status        = CASE WHEN used_count + 1 >= max_uses THEN 'used' ELSE status END
  WHERE id = v_qr.id;

  RETURN jsonb_build_object(
    'status',       'success',
    'qr_id',        v_qr.id,
    'vehicle_ids',  v_vehicle_ids,
    'activated_at', v_now
  );
END;
$$;

-- ─── 6. RLS jetons_qr : INSERT par manager (BFF service_role) ─
DROP POLICY IF EXISTS jetons_qr_insert_manager ON public.jetons_qr;
CREATE POLICY jetons_qr_insert_manager ON public.jetons_qr
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
    OR has_role(fleet_id, 'manager')
    OR has_role(fleet_id, 'organizer')
  );

-- ─── 7. RLS journal_scans_qr : lecture manager ──────────────
ALTER TABLE public.journal_scans_qr ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS journal_scans_qr_select_manager ON public.journal_scans_qr;
CREATE POLICY journal_scans_qr_select_manager ON public.journal_scans_qr
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jetons_qr jq
      WHERE jq.id = journal_scans_qr.qr_token_id
        AND (
          has_role(jq.fleet_id, 'manager') OR has_role(jq.fleet_id, 'organizer')
          OR (jq.vehicle_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM vehicules v WHERE v.id = jq.vehicle_id
              AND (has_role(v.fleet_id, 'manager') OR has_role(v.fleet_id, 'organizer'))
          ))
        )
    )
  );

DROP POLICY IF EXISTS journal_scans_qr_insert_authenticated ON public.journal_scans_qr;
CREATE POLICY journal_scans_qr_insert_authenticated ON public.journal_scans_qr
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
