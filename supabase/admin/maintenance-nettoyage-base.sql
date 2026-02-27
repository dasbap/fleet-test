-- =====================================================
-- MAINTENANCE : Rapport + Simulation + Nettoyage base
-- Smart Fleet Africa
--
-- Objectif :
-- - Fournir un rapport sur les données orphelines / doublons / incohérences
-- - Simuler le nettoyage via public.nettoyer_base_donnees(true)
-- - Permettre le nettoyage réel via public.nettoyer_base_donnees(false) (appel commenté)
--
-- Prérequis :
-- - La fonction public.nettoyer_base_donnees(p_dry_run boolean) doit être créée
--   via les migrations (voir migrations/create_nettoyer_base_donnees_function.sql).
--
-- Utilisation recommandée :
-- 1) Exécuter d'abord la SECTION 1 (rapports) seule.
-- 2) Exécuter ensuite la simulation : SELECT nettoyer_base_donnees(true) AS simulation;
-- 3) Si tout est cohérent, décommenter la ligne de nettoyage réel et l'exécuter.
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
-- SECTION 2 : SIMULATION ET NETTOYAGE
-- =====================================================

-- 2.1 Simulation (aucune suppression, pour audit uniquement)
SELECT nettoyer_base_donnees(true) AS simulation;

-- 2.2 Nettoyage réel (supprime effectivement les entrées orphelines / inutiles)
-- ATTENTION : À décommenter uniquement après avoir vérifié le rapport et la simulation.
-- SELECT nettoyer_base_donnees(false) AS nettoyage_reel;

