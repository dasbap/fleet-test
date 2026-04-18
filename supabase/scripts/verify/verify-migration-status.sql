-- =====================================================
-- RAPPORT EXAMINATEUR DE LA MIGRATION VERS FRANÇAIS
-- Smart Fleet Africa - E-samba
-- =====================================================
-- Ce script examine l'état de la migration en analysant la présence
-- et la conformité des objets principaux dans la base.
-- Utilisez ce rapport pour auditer précisément chaque étape.
-- =====================================================

-- =====================================================
-- SECTION 1 : SYNTHÈSE DE L'EXAMEN
-- =====================================================
WITH attendues AS (
  SELECT unnest(ARRAY[
    'organisations', 'flottes', 'profils', 'flotte_adhesions',
    'flotte_invitations', 'vehicules', 'affectations_vehicules',
    'creneaux_conducteurs', 'clotures_creneaux', 'travaux_maintenance',
    'preuves_maintenance', 'abonnements', 'paiements',
    'droits_vehicules', 'jetons_qr'
  ]) AS nom
),
anciennes AS (
  SELECT unnest(ARRAY[
    'orgs', 'fleets', 'profiles', 'fleet_memberships',
    'fleet_invitations', 'vehicles', 'driver_vehicle_assignments',
    'driver_shifts', 'driver_shift_closures', 'maintenance_jobs',
    'maintenance_evidence', 'subscriptions', 'payments',
    'vehicle_entitlements', 'qr_tokens'
  ]) AS nom
),
f_presentes AS (
  SELECT COUNT(*) c FROM attendues t
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public'
    AND table_name = t.nom AND table_type = 'BASE TABLE'
  )
),
a_restantes AS (
  SELECT COUNT(*) c FROM anciennes a
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public'
    AND table_name = a.nom AND table_type = 'BASE TABLE'
  )
),
exam_stats AS (
  SELECT 
    (SELECT COUNT(*) FROM attendues) AS total_attendues,
    f_presentes.c AS trouvees,
    a_restantes.c AS anciennes_restantes,
    ROUND(
      (f_presentes.c::numeric / (SELECT COUNT(*) FROM attendues)::numeric) * 100, 1
    ) AS taux
  FROM f_presentes, a_restantes
)
SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'SYNTHÈSE DE L''EXAMEN DE MIGRATION' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

WITH attendues AS (
  SELECT unnest(ARRAY[
    'organisations', 'flottes', 'profils', 'flotte_adhesions',
    'flotte_invitations', 'vehicules', 'affectations_vehicules',
    'creneaux_conducteurs', 'clotures_creneaux', 'travaux_maintenance',
    'preuves_maintenance', 'abonnements', 'paiements',
    'droits_vehicules', 'jetons_qr'
  ]) AS nom
),
anciennes AS (
  SELECT unnest(ARRAY[
    'orgs', 'fleets', 'profiles', 'fleet_memberships',
    'fleet_invitations', 'vehicles', 'driver_vehicle_assignments',
    'driver_shifts', 'driver_shift_closures', 'maintenance_jobs',
    'maintenance_evidence', 'subscriptions', 'payments',
    'vehicle_entitlements', 'qr_tokens'
  ]) AS nom
),
f_presentes AS (
  SELECT COUNT(*) c FROM attendues t
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public'
    AND table_name = t.nom AND table_type = 'BASE TABLE'
  )
),
a_restantes AS (
  SELECT COUNT(*) c FROM anciennes a
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public'
    AND table_name = a.nom AND table_type = 'BASE TABLE'
  )
),
exam_stats AS (
  SELECT 
    (SELECT COUNT(*) FROM attendues) AS total_attendues,
    f_presentes.c AS trouvees,
    a_restantes.c AS anciennes_restantes,
    ROUND(
      (f_presentes.c::numeric / (SELECT COUNT(*) FROM attendues)::numeric) * 100, 1
    ) AS taux
  FROM f_presentes, a_restantes
)
SELECT 
  '📊 EXAMEN GLOBAL' AS section,
  total_attendues AS "Tables attendues (FR)",
  trouvees AS "Tables présentes (FR)",
  anciennes_restantes AS "Tables anglaises restantes",
  taux || '%' AS "Taux de conformité",
  CASE 
    WHEN anciennes_restantes > 0 THEN '⚠️ À ÉPURER'
    WHEN trouvees = total_attendues THEN '✅ CONFORMITÉ'
    ELSE '❌ INCOMPLET'
  END AS "Statut d''examen"
FROM exam_stats;

-- =====================================================
-- SECTION 2 : EXAMEN DÉTAILLÉ DES TABLES FRANÇAISES
-- =====================================================
SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'EXAMEN DES TABLES FRANÇAISES' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

WITH correspondances AS (
  SELECT * FROM (VALUES
    ('organisations', 'orgs', 'CRITIQUE'),
    ('flottes', 'fleets', 'CRITIQUE'),
    ('profils', 'profiles', 'CRITIQUE'),
    ('flotte_adhesions', 'fleet_memberships', 'CRITIQUE'),
    ('flotte_invitations', 'fleet_invitations', 'IMPORTANT'),
    ('vehicules', 'vehicles', 'CRITIQUE'),
    ('affectations_vehicules', 'driver_vehicle_assignments', 'CRITIQUE'),
    ('creneaux_conducteurs', 'driver_shifts', 'CRITIQUE'),
    ('clotures_creneaux', 'driver_shift_closures', 'CRITIQUE'),
    ('travaux_maintenance', 'maintenance_jobs', 'IMPORTANT'),
    ('preuves_maintenance', 'maintenance_evidence', 'IMPORTANT'),
    ('abonnements', 'subscriptions', 'INFO'),
    ('paiements', 'payments', 'INFO'),
    ('droits_vehicules', 'vehicle_entitlements', 'INFO'),
    ('jetons_qr', 'qr_tokens', 'INFO')
  ) AS t(nouveau, ancien, priorite)
)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = c.nouveau
    ) THEN '✅'
    ELSE '❌'
  END AS statut,
  c.nouveau AS "Table FR",
  c.ancien AS "Table ancienne",
  c.priorite AS "Priorité",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = c.nouveau
    ) THEN 'Présente'
    ELSE 'À CRÉER'
  END AS "Message"
FROM correspondances c
ORDER BY 
  CASE c.priorite WHEN 'CRITIQUE' THEN 1 WHEN 'IMPORTANT' THEN 2 ELSE 3 END,
  c.nouveau;

-- =====================================================
-- SECTION 3 : RECHERCHE DE DOUBLONS TABLES
-- =====================================================

SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'EXISTENCE DE DOUBLONS TABLES (ANGLAISES RESTANTES)' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

WITH doublons AS (
  SELECT * FROM (VALUES
    ('orgs', 'organisations'),
    ('fleets', 'flottes'),
    ('profiles', 'profils'),
    ('fleet_memberships', 'flotte_adhesions'),
    ('fleet_invitations', 'flotte_invitations'),
    ('vehicles', 'vehicules'),
    ('driver_vehicle_assignments', 'affectations_vehicules'),
    ('driver_shifts', 'creneaux_conducteurs'),
    ('driver_shift_closures', 'clotures_creneaux'),
    ('maintenance_jobs', 'travaux_maintenance'),
    ('maintenance_evidence', 'preuves_maintenance'),
    ('subscriptions', 'abonnements'),
    ('payments', 'paiements'),
    ('vehicle_entitlements', 'droits_vehicules'),
    ('qr_tokens', 'jetons_qr')
  ) AS d(ancienne, nouvelle)
)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = d.ancienne
    ) AND EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = d.nouvelle
    ) THEN '⚠️ DOUBLON'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = d.ancienne
    ) THEN '⚠️ RESTE ANGLAISE'
    ELSE '✅ OK'
  END AS statut,
  d.ancienne AS "Table EN",
  d.nouvelle AS "Table FR liée",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = d.ancienne
    ) AND EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = d.nouvelle
    ) THEN 'DROP TABLE IF EXISTS ' || d.ancienne || ' CASCADE;'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = d.ancienne
    ) THEN 'RENOMMER: ALTER TABLE ' || d.ancienne || ' RENAME TO ' || d.nouvelle || ';'
    ELSE 'RAS'
  END AS "Correction_Suggérée"
FROM doublons d
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = d.ancienne
)
ORDER BY statut DESC, d.ancienne;

SELECT 
  '✅ Aucun reste anglais de tables détecté' AS message
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN (
    'orgs', 'fleets', 'profiles', 'fleet_memberships',
    'fleet_invitations', 'vehicles', 'driver_vehicle_assignments',
    'driver_shifts', 'driver_shift_closures', 'maintenance_jobs',
    'maintenance_evidence', 'subscriptions', 'payments',
    'vehicle_entitlements', 'qr_tokens'
  )
);

-- =====================================================
-- SECTION 4 : EXAMEN DES FONCTIONS RPC
-- =====================================================

SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'EXAMEN DES FONCTIONS FRANÇAISES' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

WITH f_attendues AS (
  SELECT * FROM (VALUES
    ('affecter_vehicule', 'assign_vehicle', 'CRITIQUE'),
    ('fermer_creneau', 'close_shift', 'CRITIQUE'),
    ('rechercher_utilisateurs', 'search_users', 'IMPORTANT'),
    ('has_role', 'has_role', 'CRITIQUE')
  ) AS t(fr, an, prio)
)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = f.fr
    ) THEN '✅'
    ELSE '❌'
  END AS statut,
  f.fr AS "Fonction FR",
  f.an AS "Ancien nom",
  f.prio AS "Priorité",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = f.fr
    ) THEN 'Présente'
    ELSE 'À créer'
  END AS "Action"
FROM f_attendues f
ORDER BY 
  CASE f.prio WHEN 'CRITIQUE' THEN 1 WHEN 'IMPORTANT' THEN 2 END,
  f.fr;

-- Analyse détaillée de has_role
SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'EXAMEN DÉTAILLÉ: has_role' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'has_role'
    ) THEN '✅'
    ELSE '❌'
  END AS statut,
  p.proname AS "Fonction",
  pg_get_function_arguments(p.oid) AS "Arguments",
  CASE 
    WHEN pg_get_function_arguments(p.oid) LIKE '%p_flotte_id%' THEN '✅ Paramètre: p_flotte_id'
    WHEN pg_get_function_arguments(p.oid) LIKE '%p_fleet_id%' THEN '⚠️ Paramètre anglais: p_fleet_id'
    ELSE 'À examiner'
  END AS "Analyse Paramètres"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'has_role';

-- FONCTIONS ANCIENNES (DOIVENT DISPARAÎTRE)
SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'FONCTIONS ANGLAISES À SUPPRIMER' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = o.oldf
    ) THEN '⚠️ ENCORE LÀ'
    ELSE '✅ SUPPRIMÉE'
  END AS statut,
  o.oldf AS "Ancienne fonction",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = o.oldf
    ) THEN 'DROP FUNCTION IF EXISTS ' || o.oldf || ' CASCADE;'
    ELSE 'RAS'
  END AS "Suppression_Suggérée"
FROM (VALUES
  ('assign_vehicle'),
  ('close_shift'),
  ('search_users')
) AS o(oldf)
ORDER BY statut DESC;

-- =====================================================
-- SECTION 5 : EXAMEN DES INDEX
-- =====================================================

SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'INDEX FRANÇAIS (Examen)' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

SELECT 
  schemaname AS "Schéma",
  tablename AS "Table",
  indexname AS "IndexFR",
  CASE 
    WHEN indexname LIKE '%vehicules%' OR indexname LIKE '%flotte%' 
      OR indexname LIKE '%adhesions%' OR indexname LIKE '%affectations%'
      OR indexname LIKE '%creneaux%' OR indexname LIKE '%clotures%'
      OR indexname LIKE '%travaux%' OR indexname LIKE '%preuves%' THEN '✅'
    ELSE 'À examiner'
  END AS "Statut"
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%vehicules%'
    OR indexname LIKE '%flotte%'
    OR indexname LIKE '%adhesions%'
    OR indexname LIKE '%affectations%'
    OR indexname LIKE '%creneaux%'
    OR indexname LIKE '%clotures%'
    OR indexname LIKE '%travaux%'
    OR indexname LIKE '%preuves%'
  )
ORDER BY tablename, indexname;

SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'INDEX ANGLAIS À SUPPRIMER' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

SELECT 
  '⚠️' AS statut,
  schemaname AS "Schéma",
  tablename AS "Table",
  indexname AS "Index_EN",
  'DROP INDEX IF EXISTS ' || schemaname || '.' || indexname || ';' AS "Supp SQL"
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%vehicles%'
    OR indexname LIKE '%fleet%'
    OR indexname LIKE '%memberships%'
    OR indexname LIKE '%assignments%'
    OR indexname LIKE '%shifts%'
    OR indexname LIKE '%closures%'
    OR indexname LIKE '%maintenance_jobs%'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- SECTION 6 : EXAMEN DES POLITIQUES RLS
-- =====================================================

SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'POLITIQUES RLS FRANÇAISES (Examen)' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

SELECT 
  schemaname AS "Schéma",
  tablename AS "Table",
  policyname AS "Politique",
  CASE 
    WHEN policyname LIKE '%vehicules%' OR policyname LIKE '%flotte%'
      OR policyname LIKE '%adhesions%' OR policyname LIKE '%affectations%'
      OR policyname LIKE '%creneaux%' OR policyname LIKE '%clotures%'
      OR policyname LIKE '%incidents%' OR policyname LIKE '%travaux%'
      OR policyname LIKE '%preuves%' OR policyname LIKE '%invitations%' THEN '✅'
    ELSE 'À examiner'
  END AS "Statut"
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    policyname LIKE '%vehicules%'
    OR policyname LIKE '%flotte%'
    OR policyname LIKE '%adhesions%'
    OR policyname LIKE '%affectations%'
    OR policyname LIKE '%creneaux%'
    OR policyname LIKE '%clotures%'
    OR policyname LIKE '%incidents%'
    OR policyname LIKE '%travaux%'
    OR policyname LIKE '%preuves%'
    OR policyname LIKE '%invitations%'
  )
ORDER BY tablename, policyname;

SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'POLITIQUES EN À SUPPRIMER' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

SELECT 
  '⚠️' AS statut,
  schemaname AS "Schéma",
  tablename AS "Table",
  policyname AS "Policy_EN",
  'DROP POLICY IF EXISTS ' || policyname || ' ON ' || schemaname || '.' || tablename || ';' AS "Supp SQL"
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    policyname LIKE '%vehicles%'
    OR policyname LIKE '%fleet%'
    OR policyname LIKE '%memberships%'
    OR policyname LIKE '%assignments%'
    OR policyname LIKE '%shifts%'
    OR policyname LIKE '%closures%'
    OR policyname LIKE '%jobs%'
    OR policyname LIKE '%evidence%'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- SECTION 7 : RECOMMANDATIONS EXAMINATEUR
-- =====================================================

SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'RECOMMANDATIONS EXAMINATEUR (SQL à appliquer)' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

-- Générer les DROP TABLE pour tables anglaises restantes
WITH reste_en AS (
  SELECT ancienne
  FROM (VALUES
    ('orgs'), ('fleets'), ('profiles'), ('fleet_memberships'),
    ('fleet_invitations'), ('vehicles'), ('driver_vehicle_assignments'),
    ('driver_shifts'), ('driver_shift_closures'), ('maintenance_jobs'),
    ('maintenance_evidence'), ('subscriptions'), ('payments'),
    ('vehicle_entitlements'), ('qr_tokens')
  ) AS d(ancienne)
  WHERE EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ancienne
  )
)
SELECT 
  '-- À supprimer (restant anglais)' AS comm,
  'DROP TABLE IF EXISTS ' || ancienne || ' CASCADE;' AS sql_cmd
FROM reste_en
ORDER BY ancienne;

-- Générer les DROP FUNCTION pour fonctions anglaises restantes
WITH f_en AS (
  SELECT f
  FROM (VALUES
    ('assign_vehicle'), ('close_shift'), ('search_users')
  ) AS x(f)
  WHERE EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = f
  )
)
SELECT 
  '-- Supprimer anciennes fonctions' AS comm,
  'DROP FUNCTION IF EXISTS ' || f || ' CASCADE;' AS sql_cmd
FROM f_en
ORDER BY f;

SELECT 
  '═══════════════════════════════════════════════════════════' AS sep,
  'FIN EXAMEN' AS titre,
  '═══════════════════════════════════════════════════════════' AS sep2;

SELECT 
  'ℹ️ PROCÉDURE EXAMINEUR' AS section,
  '1. Appliquez chaque commande SQL listée dans les recommandations' AS etape1,
  '2. Relancez le script d''examen pour valider l''état de migration' AS etape2,
  '3. Relancer la migration initiale en cas de manque côté tables françaises' AS etape3;
