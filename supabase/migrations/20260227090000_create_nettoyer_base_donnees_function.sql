-- =====================================================
-- Migration : création de la fonction de nettoyage
-- Objectif : définir public.nettoyer_base_donnees(p_dry_run boolean)
-- sans lancer de nettoyage réel lors de l'application de la migration.
-- =====================================================

CREATE OR REPLACE FUNCTION public.nettoyer_base_donnees(p_dry_run boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := jsonb_build_object('dry_run', p_dry_run, 'deleted', jsonb_build_object(), 'errors', jsonb_build_array());
  v_count int;
BEGIN
  -- 1. clotures_creneaux sans creneau
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM clotures_creneaux cl
    WHERE NOT EXISTS (SELECT 1 FROM creneaux_conducteurs cc WHERE cc.id = cl.shift_id);
  ELSE
    DELETE FROM clotures_creneaux
    WHERE NOT EXISTS (SELECT 1 FROM creneaux_conducteurs cc WHERE cc.id = clotures_creneaux.shift_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','clotures_creneaux'], to_jsonb(coalesce(v_count, 0)::int));

  -- 2. creneaux_conducteurs sans affectation
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM creneaux_conducteurs cc
    WHERE NOT EXISTS (SELECT 1 FROM affectations_vehicules av WHERE av.id = cc.assignment_id);
  ELSE
    DELETE FROM creneaux_conducteurs
    WHERE NOT EXISTS (SELECT 1 FROM affectations_vehicules av WHERE av.id = creneaux_conducteurs.assignment_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','creneaux_conducteurs'], to_jsonb(coalesce(v_count, 0)::int));

  -- 3. preuves_maintenance sans travail
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM preuves_maintenance pm
    WHERE NOT EXISTS (SELECT 1 FROM travaux_maintenance tm WHERE tm.id = pm.job_id);
  ELSE
    DELETE FROM preuves_maintenance
    WHERE NOT EXISTS (SELECT 1 FROM travaux_maintenance tm WHERE tm.id = preuves_maintenance.job_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','preuves_maintenance'], to_jsonb(coalesce(v_count, 0)::int));

  -- 4. listes_verification_maintenance sans travail
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM listes_verification_maintenance lv
    WHERE NOT EXISTS (SELECT 1 FROM travaux_maintenance tm WHERE tm.id = lv.job_id);
  ELSE
    DELETE FROM listes_verification_maintenance
    WHERE NOT EXISTS (SELECT 1 FROM travaux_maintenance tm WHERE tm.id = listes_verification_maintenance.job_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','listes_verification_maintenance'], to_jsonb(coalesce(v_count, 0)::int));

  -- 5. incidents sans vehicule
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM incidents i
    WHERE NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = i.vehicle_id);
  ELSE
    DELETE FROM incidents
    WHERE NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = incidents.vehicle_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','incidents'], to_jsonb(coalesce(v_count, 0)::int));

  -- 6. travaux_maintenance sans vehicule ou sans flotte
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM travaux_maintenance tm
    WHERE NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = tm.vehicle_id)
       OR NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = tm.fleet_id);
  ELSE
    DELETE FROM travaux_maintenance
    WHERE NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = travaux_maintenance.vehicle_id)
       OR NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = travaux_maintenance.fleet_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','travaux_maintenance'], to_jsonb(coalesce(v_count, 0)::int));

  -- 6b. droits_vehicules sans vehicule ou sans abonnement
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM droits_vehicules dv
    WHERE NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = dv.vehicle_id)
       OR NOT EXISTS (SELECT 1 FROM abonnements a WHERE a.id = dv.subscription_id);
  ELSE
    DELETE FROM droits_vehicules
    WHERE NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = droits_vehicules.vehicle_id)
       OR NOT EXISTS (SELECT 1 FROM abonnements a WHERE a.id = droits_vehicules.subscription_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','droits_vehicules'], to_jsonb(coalesce(v_count, 0)::int));

  -- 6c. abonnements sans flotte
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM abonnements a
    WHERE NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = a.fleet_id);
  ELSE
    DELETE FROM abonnements
    WHERE NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = abonnements.fleet_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','abonnements'], to_jsonb(coalesce(v_count, 0)::int));

  -- 7. affectations_vehicules sans vehicule ou sans conducteur
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM affectations_vehicules av
    WHERE NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = av.vehicle_id)
       OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = av.driver_user_id);
  ELSE
    DELETE FROM affectations_vehicules
    WHERE NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = affectations_vehicules.vehicle_id)
       OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = affectations_vehicules.driver_user_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','affectations_vehicules'], to_jsonb(coalesce(v_count, 0)::int));

  -- 8. flotte_adhesions sans flotte ou sans utilisateur
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM flotte_adhesions fa
    WHERE NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = fa.fleet_id)
       OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = fa.user_id);
  ELSE
    DELETE FROM flotte_adhesions
    WHERE NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = flotte_adhesions.fleet_id)
       OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = flotte_adhesions.user_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','flotte_adhesions'], to_jsonb(coalesce(v_count, 0)::int));

  -- 9. flotte_invitations sans flotte
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM flotte_invitations fi
    WHERE NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = fi.fleet_id);
  ELSE
    DELETE FROM flotte_invitations
    WHERE NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = flotte_invitations.fleet_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','flotte_invitations'], to_jsonb(coalesce(v_count, 0)::int));

  -- 10. jetons_qr type véhicule sans véhicule valide + jetons expirés (lot exclus)
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM jetons_qr jq
    WHERE (COALESCE(jq.type, 'vehicle') = 'vehicle'
           AND (jq.vehicle_id IS NULL OR NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = jq.vehicle_id)))
       OR jq.expires_at < now();
  ELSE
    DELETE FROM jetons_qr
    WHERE (COALESCE(type, 'vehicle') = 'vehicle'
           AND (vehicle_id IS NULL OR NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = jetons_qr.vehicle_id)))
       OR expires_at < now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','jetons_qr'], to_jsonb(coalesce(v_count, 0)::int));

  -- 11. vehicules sans flotte
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM vehicules v
    WHERE NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = v.fleet_id);
  ELSE
    DELETE FROM vehicules
    WHERE NOT EXISTS (SELECT 1 FROM flottes f WHERE f.id = vehicules.fleet_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','vehicules'], to_jsonb(coalesce(v_count, 0)::int));

  -- 12. invitations expirées (optionnel, entrées inutiles)
  IF p_dry_run THEN
    SELECT count(*) INTO v_count FROM flotte_invitations
    WHERE expires_at IS NOT NULL AND expires_at < now();
  ELSE
    DELETE FROM flotte_invitations
    WHERE expires_at IS NOT NULL AND expires_at < now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  v_result := jsonb_set(v_result, ARRAY['deleted','flotte_invitations_expirees'], to_jsonb(coalesce(v_count, 0)::int));

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nettoyer_base_donnees(boolean) TO authenticated;
COMMENT ON FUNCTION public.nettoyer_base_donnees(boolean) IS
'Nettoie les entrées orphelines et inutiles. p_dry_run=true : simulation uniquement. p_dry_run=false : suppression réelle.';

