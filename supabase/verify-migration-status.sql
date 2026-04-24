-- ============================================================
-- SCRIPT DE VÉRIFICATION : Migration vers le français
-- E-Samba / Smart Fleet Africa
-- Exécuté automatiquement par le workflow CI « Verify Migration to French »
-- ============================================================
-- Ce script inspecte le schéma public et rapporte :
--   ✅  Tables françaises présentes
--   ❌  Tables françaises manquantes (ERREURS critiques)
--   ⚠️  Tables anglaises résiduelles (AVERTISSEMENTS)
-- ============================================================

-- ── 1. Récapitulatif général ─────────────────────────────────────────────────

SELECT '=== VÉRIFICATION SCHÉMA FRANÇAIS ===' AS rapport;

SELECT
  schemaname,
  tablename,
  tableowner,
  rowsecurity AS rls_active
FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ── 2. Tables françaises attendues ───────────────────────────────────────────

SELECT '--- Tables françaises attendues ---' AS section;

WITH tables_attendues (nom_table) AS (
  VALUES
    ('profils'),
    ('vehicules'),
    ('flotte_adhesions'),
    ('flotte_invitations'),
    ('affectations_vehicules'),
    ('creneaux_conducteurs'),
    ('clotures_creneaux'),
    ('travaux_maintenance'),
    ('preuves_maintenance'),
    ('abonnements'),
    ('jetons_qr'),
    ('incidents'),
    ('journal_carburant'),
    ('scores_conducteurs'),
    ('controles_journaliers'),
    ('transits_cemac')
)
SELECT
  ta.nom_table,
  CASE
    WHEN t.tablename IS NOT NULL THEN '✅ présente'
    ELSE '❌ MANQUANTE'
  END AS statut
FROM tables_attendues ta
LEFT JOIN pg_catalog.pg_tables t
  ON t.schemaname = 'public' AND t.tablename = ta.nom_table
ORDER BY ta.nom_table;

-- ── 3. Tables anglaises résiduelles (doivent être absentes) ──────────────────

SELECT '--- Tables anglaises résiduelles (doivent être absentes) ---' AS section;

WITH tables_anglaises (nom_table) AS (
  VALUES
    ('orgs'),
    ('fleets'),
    ('profiles'),
    ('fleet_memberships'),
    ('fleet_invitations'),
    ('vehicles'),
    ('driver_vehicle_assignments'),
    ('driver_shifts'),
    ('driver_shift_closures'),
    ('maintenance_jobs'),
    ('maintenance_evidence'),
    ('maintenance_checklists'),
    ('payments'),
    ('subscriptions'),
    ('vehicle_entitlements'),
    ('qr_tokens')
)
SELECT
  ta.nom_table,
  CASE
    WHEN t.tablename IS NOT NULL THEN '⚠️ AVERTISSEMENTS — table anglaise encore présente'
    ELSE '✅ absente (correct)'
  END AS statut
FROM tables_anglaises ta
LEFT JOIN pg_catalog.pg_tables t
  ON t.schemaname = 'public' AND t.tablename = ta.nom_table
ORDER BY ta.nom_table;

-- ── 4. Synthèse erreurs critiques ────────────────────────────────────────────

SELECT '--- Synthèse ---' AS section;

WITH tables_attendues (nom_table) AS (
  VALUES
    ('profils'),
    ('vehicules'),
    ('flotte_adhesions'),
    ('flotte_invitations'),
    ('affectations_vehicules'),
    ('creneaux_conducteurs'),
    ('clotures_creneaux'),
    ('travaux_maintenance'),
    ('preuves_maintenance'),
    ('abonnements'),
    ('jetons_qr'),
    ('incidents'),
    ('journal_carburant'),
    ('scores_conducteurs'),
    ('controles_journaliers'),
    ('transits_cemac')
),
manquantes AS (
  SELECT count(*) AS nb
  FROM tables_attendues ta
  LEFT JOIN pg_catalog.pg_tables t
    ON t.schemaname = 'public' AND t.tablename = ta.nom_table
  WHERE t.tablename IS NULL
),
residuelles AS (
  SELECT count(*) AS nb
  FROM (VALUES
    ('orgs'),('fleets'),('profiles'),('fleet_memberships'),('fleet_invitations'),
    ('vehicles'),('driver_vehicle_assignments'),('driver_shifts'),
    ('driver_shift_closures'),('maintenance_jobs'),('maintenance_evidence'),
    ('maintenance_checklists'),('payments'),('subscriptions'),
    ('vehicle_entitlements'),('qr_tokens')
  ) AS ta(nom_table)
  JOIN pg_catalog.pg_tables t
    ON t.schemaname = 'public' AND t.tablename = ta.nom_table
)
SELECT
  m.nb AS tables_manquantes,
  r.nb AS tables_anglaises_residuelles,
  CASE
    WHEN m.nb > 0 THEN '❌ ERREURS — ' || m.nb || ' table(s) française(s) manquante(s)'
    WHEN r.nb > 0 THEN '⚠️ AVERTISSEMENTS — ' || r.nb || ' table(s) anglaise(s) résiduelle(s)'
    ELSE '✅ Migration française complète et cohérente'
  END AS verdict
FROM manquantes m, residuelles r;
