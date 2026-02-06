-- =====================================================
-- Migration: Règle métier véhicule actif
-- Date: 2025-02-06
-- Description: Un véhicule avec le statut "ok" doit être lié à un chauffeur actif
-- =====================================================

-- Fonction pour vérifier qu'un véhicule "ok" a un chauffeur actif assigné
-- Cette fonction peut être utilisée pour valider avant de mettre à jour le statut
CREATE OR REPLACE FUNCTION public.verifier_statut_vehicule_actif(
  p_vehicle_id uuid,
  p_status vehicle_status
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_active_assignment boolean;
BEGIN
  -- Si le statut n'est pas "ok", la validation passe toujours
  IF p_status != 'ok' THEN
    RETURN true;
  END IF;

  -- Vérifier s'il y a une assignation active pour ce véhicule
  SELECT EXISTS(
    SELECT 1 
    FROM affectations_vehicules
    WHERE vehicle_id = p_vehicle_id 
      AND is_active = true
  ) INTO v_has_active_assignment;

  -- Un véhicule "ok" doit avoir une assignation active
  IF NOT v_has_active_assignment THEN
    RAISE EXCEPTION 'Un véhicule avec le statut "ok" doit avoir un chauffeur actif assigné. Véhicule ID: %', p_vehicle_id;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verifier_statut_vehicule_actif(uuid, vehicle_status) TO authenticated;

COMMENT ON FUNCTION public.verifier_statut_vehicule_actif(uuid, vehicle_status) IS
'Vérifie qu''un véhicule avec le statut "ok" a bien un chauffeur actif assigné. Lève une exception si la règle métier n''est pas respectée.';

-- Trigger pour valider automatiquement lors de la mise à jour du statut
CREATE OR REPLACE FUNCTION public.trigger_verifier_statut_vehicule_actif()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si le statut passe à "ok", vérifier qu'il y a une assignation active
  IF NEW.status = 'ok' AND (OLD.status IS NULL OR OLD.status != 'ok') THEN
    PERFORM public.verifier_statut_vehicule_actif(NEW.id, NEW.status);
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table vehicules
DROP TRIGGER IF EXISTS check_vehicle_active_status ON vehicules;

CREATE TRIGGER check_vehicle_active_status
  BEFORE UPDATE OF status ON vehicules
  FOR EACH ROW
  WHEN (NEW.status = 'ok')
  EXECUTE FUNCTION public.trigger_verifier_statut_vehicule_actif();

COMMENT ON TRIGGER check_vehicle_active_status ON vehicules IS
'Valide automatiquement qu''un véhicule avec le statut "ok" a un chauffeur actif assigné avant la mise à jour.';

-- Note: Pour les véhicules existants avec statut "ok" mais sans assignation active,
-- ils seront automatiquement bloqués lors de la prochaine tentative de mise à jour.
-- Pour corriger les données existantes, exécuter :
-- UPDATE vehicules SET status = 'blocked' WHERE status = 'ok' AND id NOT IN (
--   SELECT DISTINCT vehicle_id FROM affectations_vehicules WHERE is_active = true
-- );
