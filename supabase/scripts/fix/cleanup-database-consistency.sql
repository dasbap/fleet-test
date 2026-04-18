-- =====================================================
-- IMPORTANT : Dans Supabase SQL Editor, COPIER TOUT LE CONTENU
-- de ce fichier (Ctrl+A puis Ctrl+C), puis coller et exécuter.
-- Ne jamais saisir ou coller le chemin du fichier comme requête.
-- =====================================================
-- NETTOYAGE BASE DE DONNÉES - Cohérence (noms français)
-- Smart Fleet Africa
-- =====================================================
-- 1. Exécuter la section RAPPORT pour lister orphelins, doublons, incohérences
-- 2. Exécuter nettoyer_base_donnees(true) pour simuler le nettoyage
-- 3. Exécuter nettoyer_base_donnees(false) pour appliquer le nettoyage
-- =====================================================

-- =====================================================
-- SECTION 1 : RAPPORT - Entrées inutiles, doublons, incohérences
-- =====================================================

-- 1.1 Données orphelines (références invalides)
SELECT *
FROM (
  SELECT
    'ORPHELINS' AS section,
    'flotte_adhesions sans flotte' AS type,
    count(*)::text AS nombre
  FROM flotte_adhesions fa
  LEFT JOIN flottes f ON f.id = fa.fleet_id
  WHERE f.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'flotte_adhesions sans utilisateur auth', count(*)::text
  FROM flotte_adhesions fa
  LEFT JOIN auth.users u ON u.id = fa.user_id
  WHERE u.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'vehicules sans flotte', count(*)::text
  FROM vehicules v
  LEFT JOIN flottes f ON f.id = v.fleet_id
  WHERE f.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'affectations_vehicules sans vehicule', count(*)::text
  FROM affectations_vehicules av
  LEFT JOIN vehicules v ON v.id = av.vehicle_id
  WHERE v.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'affectations_vehicules sans conducteur (auth)', count(*)::text
  FROM affectations_vehicules av
  LEFT JOIN auth.users u ON u.id = av.driver_user_id
  WHERE u.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'creneaux_conducteurs sans affectation', count(*)::text
  FROM creneaux_conducteurs cc
  LEFT JOIN affectations_vehicules av ON av.id = cc.assignment_id
  WHERE av.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'clotures_creneaux sans creneau', count(*)::text
  FROM clotures_creneaux cl
  LEFT JOIN creneaux_conducteurs cc ON cc.id = cl.shift_id
  WHERE cc.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'incidents sans vehicule', count(*)::text
  FROM incidents i
  LEFT JOIN vehicules v ON v.id = i.vehicle_id
  WHERE v.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'travaux_maintenance sans vehicule', count(*)::text
  FROM travaux_maintenance tm
  LEFT JOIN vehicules v ON v.id = tm.vehicle_id
  WHERE v.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'travaux_maintenance sans flotte', count(*)::text
  FROM travaux_maintenance tm
  LEFT JOIN flottes f ON f.id = tm.fleet_id
  WHERE f.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'preuves_maintenance sans travail', count(*)::text
  FROM preuves_maintenance pm
  LEFT JOIN travaux_maintenance tm ON tm.id = pm.job_id
  WHERE tm.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'listes_verification_maintenance sans travail', count(*)::text
  FROM listes_verification_maintenance lv
  LEFT JOIN travaux_maintenance tm ON tm.id = lv.job_id
  WHERE tm.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'flotte_invitations sans flotte', count(*)::text
  FROM flotte_invitations fi
  LEFT JOIN flottes f ON f.id = fi.fleet_id
  WHERE f.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'abonnements sans flotte', count(*)::text
  FROM abonnements a
  LEFT JOIN flottes f ON f.id = a.fleet_id
  WHERE f.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'droits_vehicules sans vehicule', count(*)::text
  FROM droits_vehicules dv
  LEFT JOIN vehicules v ON v.id = dv.vehicle_id
  WHERE v.id IS NULL

  UNION ALL

  SELECT 'ORPHELINS', 'jetons_qr sans vehicule', count(*)::text
  FROM jetons_qr jq
  WHERE (jq.type IS DISTINCT FROM 'lot' OR jq.type IS NULL)
    AND (jq.vehicle_id IS NULL OR NOT EXISTS (SELECT 1 FROM vehicules v WHERE v.id = jq.vehicle_id))
) t
;

-- 1.2 Doublons (contraintes métier)
SELECT *
FROM (
  SELECT
    'DOUBLONS' AS section,
    'vehicules (flotte + immatriculation)' AS type,
    count(*)::text AS nombre
  FROM (
    SELECT fleet_id, registration
    FROM vehicules
    GROUP BY fleet_id, registration
    HAVING count(*) > 1
  ) d

  UNION ALL

  SELECT 'DOUBLONS', 'flotte_invitations (code)', count(*)::text
  FROM (
    SELECT code FROM flotte_invitations GROUP BY code HAVING count(*) > 1
  ) d

  UNION ALL

  SELECT 'DOUBLONS', 'flotte_adhesions (flotte + user + role)', count(*)::text
  FROM (
    SELECT fleet_id, user_id, role
    FROM flotte_adhesions
    GROUP BY fleet_id, user_id, role
    HAVING count(*) > 1
  ) d
) t
;

-- 1.3 Entrées inutiles (expirées / obsolètes)
SELECT *
FROM (
  SELECT
    'INUTILES' AS section,
    'flotte_invitations expirées' AS type,
    count(*)::text AS nombre
  FROM flotte_invitations
  WHERE expires_at IS NOT NULL AND expires_at < now()

  UNION ALL

  SELECT 'INUTILES', 'jetons_qr expirés', count(*)::text
  FROM jetons_qr
  WHERE expires_at < now()
) t
;

-- 1.4 Incohérences logiques (optionnel)
SELECT *
FROM (
  SELECT
    'INCOHERENCES' AS section,
    'creneaux fermés sans km_end' AS type,
    count(*)::text AS nombre
  FROM creneaux_conducteurs
  WHERE status = 'closed' AND km_end IS NULL

  UNION ALL

  SELECT 'INCOHERENCES', 'creneaux fermés sans ended_at', count(*)::text
  FROM creneaux_conducteurs
  WHERE status = 'closed' AND ended_at IS NULL

  UNION ALL

  SELECT 'INCOHERENCES', 'affectations actives avec ends_at renseigné', count(*)::text
  FROM affectations_vehicules
  WHERE is_active = true AND ends_at IS NOT NULL
) t
;

-- =====================================================
-- SECTION 2 : FONCTION DE NETTOYAGE (ordre respectant les FK)
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

-- =====================================================
-- UTILISATION
-- =====================================================
-- 1. Rapport : exécuter toute la SECTION 1 (requêtes SELECT) dans Supabase SQL Editor
--    → Affiche les orphelins, doublons, entrées inutiles, incohérences (aucune modification)
-- 2. Simulation : SELECT nettoyer_base_donnees(true);
--    → Retourne le nombre de lignes qui seraient supprimées par table (aucune suppression)
-- 3. Nettoyage réel : SELECT nettoyer_base_donnees(false);
--    → Supprime effectivement les entrées orphelines et inutiles (invitations expirées, jetons expirés)
--
-- Note : Les doublons sont listés dans le rapport mais ne sont pas supprimés automatiquement
-- (contraintes UNIQUE devraient les empêcher ; en cas de doublon, corriger manuellement).
-- =====================================================

-- =====================================================
-- EXÉCUTION : simulation puis nettoyage réel
-- =====================================================
-- 1) Simulation (aucune suppression) :
SELECT nettoyer_base_donnees(true) AS simulation;

-- 2) Si le résultat convient, décommenter et ré-exécuter uniquement la ligne ci-dessous :
-- SELECT nettoyer_base_donnees(false) AS nettoyage_reel;
