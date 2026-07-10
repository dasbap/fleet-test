-- Remove the legacy 6-argument fermer_creneau overload after ensuring the
-- current idempotent 7-argument RPC exists. Keeping both functions makes
-- 6-argument SQL calls ambiguous.

ALTER TABLE public.clotures_creneaux
  ADD COLUMN IF NOT EXISTS client_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clotures_client_idempotency_key
  ON public.clotures_creneaux (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

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

  UPDATE public.creneaux_conducteurs
    SET km_end = GREATEST(COALESCE(km_end, km_start), p_km_fin),
        ended_at = COALESCE(ended_at, now()),
        status = 'closed'
  WHERE id = p_creneau_id;

  UPDATE public.vehicules v
  SET current_km = GREATEST(COALESCE(v.current_km, 0), p_km_fin)
  FROM public.creneaux_conducteurs c
  JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  WHERE c.id = p_creneau_id
    AND v.id = a.vehicle_id;

  INSERT INTO public.clotures_creneaux(
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

DROP FUNCTION IF EXISTS public.fermer_creneau(uuid, integer, integer, text, text, text);

GRANT EXECUTE ON FUNCTION public.fermer_creneau(uuid, integer, integer, text, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
