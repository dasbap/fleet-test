-- Journal carburant offline-first avec idempotence.

CREATE TABLE IF NOT EXISTS public.journal_carburant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL REFERENCES public.profils(user_id) ON DELETE RESTRICT,
  liters numeric(10, 3) NOT NULL CHECK (liters > 0),
  amount_xof integer NOT NULL CHECK (amount_xof >= 0),
  odometer_km integer NOT NULL CHECK (odometer_km >= 0),
  purchased_at timestamptz NOT NULL,
  station_name text NULL,
  receipt_ref text NULL,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_carburant_idempotency_key
  ON public.journal_carburant(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_journal_carburant_vehicle_created_at
  ON public.journal_carburant(vehicle_id, created_at DESC);

ALTER TABLE public.journal_carburant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_carburant_select_member" ON public.journal_carburant;
CREATE POLICY "journal_carburant_select_member"
  ON public.journal_carburant
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = journal_carburant.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

DROP POLICY IF EXISTS "journal_carburant_insert_driver" ON public.journal_carburant;
CREATE POLICY "journal_carburant_insert_driver"
  ON public.journal_carburant
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = driver_user_id
    AND EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = journal_carburant.fleet_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

DROP POLICY IF EXISTS "journal_carburant_update_owner" ON public.journal_carburant;
CREATE POLICY "journal_carburant_update_owner"
  ON public.journal_carburant
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_user_id)
  WITH CHECK (auth.uid() = driver_user_id);

CREATE OR REPLACE FUNCTION public.enregistrer_carburant_offline(
  p_fleet_id uuid,
  p_vehicle_id uuid,
  p_driver_user_id uuid,
  p_liters numeric,
  p_amount_xof integer,
  p_odometer_km integer,
  p_purchased_at timestamptz,
  p_station_name text DEFAULT NULL,
  p_receipt_ref text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF auth.uid() <> p_driver_user_id THEN
    RAISE EXCEPTION 'Action non autorisée pour ce conducteur';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key requis';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.journal_carburant
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  INSERT INTO public.journal_carburant (
    fleet_id,
    vehicle_id,
    driver_user_id,
    liters,
    amount_xof,
    odometer_km,
    purchased_at,
    station_name,
    receipt_ref,
    idempotency_key
  )
  VALUES (
    p_fleet_id,
    p_vehicle_id,
    p_driver_user_id,
    p_liters,
    p_amount_xof,
    p_odometer_km,
    p_purchased_at,
    NULLIF(trim(p_station_name), ''),
    NULLIF(trim(p_receipt_ref), ''),
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enregistrer_carburant_offline(
  uuid,
  uuid,
  uuid,
  numeric,
  integer,
  integer,
  timestamptz,
  text,
  text,
  uuid
) TO authenticated;
