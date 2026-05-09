-- =====================================================
-- Sécurité : fixer search_path sur les fonctions (Function Search Path Mutable)
-- =====================================================

-- Supprimer les anciennes fonctions sans search_path fixé (noms anglais ou doublons)
DROP FUNCTION IF EXISTS public.search_users(text, int);
DROP FUNCTION IF EXISTS close_shift(uuid, int, int, text, text, text);

-- affecter_vehicule : ajouter SET search_path = public
CREATE OR REPLACE FUNCTION public.affecter_vehicule(
  p_flotte_id uuid,
  p_vehicule_id uuid,
  p_conducteur_utilisateur_id uuid,
  p_debute_a timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicule vehicules%ROWTYPE;
  v_affectation_id uuid;
BEGIN
  SELECT * INTO v_vehicule
  FROM vehicules
  WHERE id = p_vehicule_id AND fleet_id = p_flotte_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'vehicule_non_trouve'; END IF;
  IF v_vehicule.status = 'blocked' THEN RAISE EXCEPTION 'vehicule_bloque'; END IF;

  IF EXISTS (
    SELECT 1
    FROM affectations_vehicules a
    JOIN creneaux_conducteurs c ON c.assignment_id = a.id
    LEFT JOIN clotures_creneaux cl ON cl.shift_id = c.id
    WHERE a.vehicle_id = p_vehicule_id
      AND a.is_active = false
      AND c.status = 'closed'
      AND cl.id IS NULL
      AND c.ended_at > now() - interval '7 days'
  ) THEN
    RAISE EXCEPTION 'cloture_manquante_bloque_affectation';
  END IF;

  IF EXISTS (SELECT 1 FROM affectations_vehicules WHERE driver_user_id = p_conducteur_utilisateur_id AND is_active = true)
  THEN RAISE EXCEPTION 'conducteur_deja_affecte'; END IF;

  INSERT INTO affectations_vehicules(fleet_id, vehicle_id, driver_user_id, starts_at, created_by)
  VALUES (p_flotte_id, p_vehicule_id, p_conducteur_utilisateur_id, p_debute_a, auth.uid())
  RETURNING id INTO v_affectation_id;

  RETURN v_affectation_id;
END;
$$;

-- fermer_creneau : ajouter SET search_path = public
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

-- rechercher_utilisateurs : s'assurer que search_path est fixé
CREATE OR REPLACE FUNCTION public.rechercher_utilisateurs(
  p_terme_recherche text,
  p_limite int DEFAULT 20
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusee: Utilisateur doit etre authentifie.';
  END IF;

  IF p_limite > 100 THEN
    p_limite := 100;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    u.id as user_id,
    u.email,
    p.full_name,
    p.phone,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profils p ON p.user_id = u.id
  WHERE 
    (LOWER(u.email) LIKE LOWER('%' || p_terme_recherche || '%'))
    OR
    (p.full_name IS NOT NULL AND LOWER(p.full_name) LIKE LOWER('%' || p_terme_recherche || '%'))
  ORDER BY 
    CASE WHEN LOWER(u.email) = LOWER(p_terme_recherche) THEN 1 ELSE 2 END,
    u.created_at DESC
  LIMIT p_limite;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rechercher_utilisateurs(text, int) TO authenticated;

-- trigger_verifier_statut_vehicule_actif : ajouter SET search_path = public
CREATE OR REPLACE FUNCTION public.trigger_verifier_statut_vehicule_actif()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ok' AND (OLD.status IS NULL OR OLD.status != 'ok') THEN
    PERFORM public.verifier_statut_vehicule_actif(NEW.id, NEW.status);
  END IF;

  RETURN NEW;
END;
$$;
