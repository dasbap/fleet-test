-- Vérifie les prérequis avant clôture d'une intervention maintenance (statut ready)
DROP FUNCTION IF EXISTS public.verifier_recette_maintenance(uuid);

CREATE OR REPLACE FUNCTION public.verifier_recette_maintenance(p_job_id uuid)
RETURNS TABLE (peut_cloturer boolean, message_blocage text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.travaux_maintenance%ROWTYPE;
  v_before_count int;
  v_after_count int;
BEGIN
  SELECT * INTO v_job
  FROM public.travaux_maintenance tm
  WHERE tm.id = p_job_id;

  IF NOT FOUND THEN
    peut_cloturer := false;
    message_blocage := 'Intervention introuvable.';
    RETURN NEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = v_job.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  ) THEN
    peut_cloturer := false;
    message_blocage := 'Accès refusé à cette intervention.';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_job.status <> 'in_progress' THEN
    peut_cloturer := false;
    message_blocage := 'L''intervention n''est pas en cours.';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT count(*)::int INTO v_before_count
  FROM public.preuves_maintenance pm
  WHERE pm.job_id = p_job_id
    AND pm.kind = 'before';

  SELECT count(*)::int INTO v_after_count
  FROM public.preuves_maintenance pm
  WHERE pm.job_id = p_job_id
    AND pm.kind = 'after';

  IF v_before_count < 1 THEN
    peut_cloturer := false;
    message_blocage := 'Ajoutez au moins une photo avant intervention.';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_after_count < 1 THEN
    peut_cloturer := false;
    message_blocage := 'Ajoutez au moins une photo après intervention.';
    RETURN NEXT;
    RETURN;
  END IF;

  peut_cloturer := true;
  message_blocage := NULL;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.verifier_recette_maintenance(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verifier_recette_maintenance(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.verifier_recette_maintenance(uuid) TO authenticated;

COMMENT ON FUNCTION public.verifier_recette_maintenance(uuid) IS
  'Contrôle recette maintenance : adhésion flotte, statut in_progress, ≥1 photo avant et ≥1 photo après.';
