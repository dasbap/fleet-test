-- Idempotence client pour sync offline terrain (E-Samba)
-- Évite les doublons à la reconnexion après crash ou retry.

ALTER TABLE public.creneaux_conducteurs
  ADD COLUMN IF NOT EXISTS client_idempotency_key text;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS client_idempotency_key text;

ALTER TABLE public.controles_journaliers
  ADD COLUMN IF NOT EXISTS client_idempotency_key text;

ALTER TABLE public.clotures_creneaux
  ADD COLUMN IF NOT EXISTS client_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_creneaux_client_idempotency_key
  ON public.creneaux_conducteurs (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_client_idempotency_key
  ON public.incidents (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_controles_journaliers_client_idempotency_key
  ON public.controles_journaliers (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clotures_client_idempotency_key
  ON public.clotures_creneaux (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

-- Clôture créneau idempotente via clé client optionnelle
CREATE OR REPLACE FUNCTION public.fermer_creneau(
  p_creneau_id uuid,
  p_km_fin int,
  p_revenu_declare int,
  p_mode_collecte text,
  p_type_preuve text,
  p_valeur_preuve text,
  p_idempotency_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clotures_creneaux
    WHERE client_idempotency_key = p_idempotency_key
  ) THEN
    RETURN;
  END IF;

  UPDATE creneaux_conducteurs
    SET km_end = GREATEST(COALESCE(km_end, km_start), p_km_fin),
        ended_at = COALESCE(ended_at, now()),
        status = 'closed'
  WHERE id = p_creneau_id;

  UPDATE vehicules v
  SET current_km = GREATEST(COALESCE(v.current_km, 0), p_km_fin)
  FROM creneaux_conducteurs c
  JOIN affectations_vehicules a ON a.id = c.assignment_id
  WHERE c.id = p_creneau_id
    AND v.id = a.vehicle_id;

  INSERT INTO clotures_creneaux(
    shift_id,
    revenue_declared,
    collection_mode,
    proof_type,
    proof_value,
    client_idempotency_key
  )
  VALUES (
    p_creneau_id,
    p_revenu_declare,
    p_mode_collecte,
    p_type_preuve,
    p_valeur_preuve,
    p_idempotency_key
  )
  ON CONFLICT (shift_id) DO UPDATE
    SET revenue_declared = excluded.revenue_declared,
        collection_mode = excluded.collection_mode,
        proof_type = excluded.proof_type,
        proof_value = excluded.proof_value,
        client_idempotency_key = COALESCE(excluded.client_idempotency_key, clotures_creneaux.client_idempotency_key),
        status = 'pending';
END;
$$;
