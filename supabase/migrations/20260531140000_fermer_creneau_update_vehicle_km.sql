-- Clôture créneau : met à jour le km véhicule côté serveur (conducteur sans droit UPDATE vehicules).
CREATE OR REPLACE FUNCTION public.fermer_creneau(
  p_creneau_id uuid,
  p_km_fin int,
  p_revenu_declare int,
  p_mode_collecte text,
  p_type_preuve text,
  p_valeur_preuve text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE creneaux_conducteurs
    SET km_end = p_km_fin, ended_at = now(), status = 'closed'
  WHERE id = p_creneau_id;

  UPDATE vehicules v
  SET current_km = GREATEST(COALESCE(v.current_km, 0), p_km_fin)
  FROM creneaux_conducteurs c
  JOIN affectations_vehicules a ON a.id = c.assignment_id
  WHERE c.id = p_creneau_id
    AND v.id = a.vehicle_id;

  INSERT INTO clotures_creneaux(shift_id, revenue_declared, collection_mode, proof_type, proof_value)
  VALUES (p_creneau_id, p_revenu_declare, p_mode_collecte, p_type_preuve, p_valeur_preuve)
  ON CONFLICT (shift_id) DO UPDATE
    SET revenue_declared = excluded.revenue_declared,
        collection_mode = excluded.collection_mode,
        proof_type = excluded.proof_type,
        proof_value = excluded.proof_value,
        status = 'pending';
END;
$$;
