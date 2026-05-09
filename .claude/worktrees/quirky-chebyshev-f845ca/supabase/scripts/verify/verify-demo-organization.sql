-- =====================================================
-- VÉRIFICATION ORGA DEMO E-SAMBA
-- Smart Fleet Africa
-- =====================================================
-- Vérifie que le script create-demo-organization-complete.sql
-- a bien créé une organisation type complète.
-- À exécuter dans Supabase SQL Editor.
-- =====================================================

WITH org AS (
  SELECT id
  FROM organisations
  WHERE name = 'Organisation DEMO E-Samba'
  ORDER BY created_at ASC
  LIMIT 1
),
flottes_demo AS (
  SELECT f.*
  FROM flottes f
  JOIN org o ON o.id = f.org_id
  WHERE f.name IN ('Flotte DEMO Starter', 'Flotte DEMO Pro', 'Flotte DEMO Organisateur')
),
vehicules_demo AS (
  SELECT v.*
  FROM vehicules v
  JOIN flottes_demo f ON f.id = v.fleet_id
  WHERE v.registration IN (
    'DEMO-START-001',
    'DEMO-START-002',
    'DEMO-PRO-001',
    'DEMO-PRO-002',
    'DEMO-ORG-001'
  )
),
plans_demo AS (
  SELECT * FROM plans WHERE code IN ('starter', 'pro', 'organizer')
),
abonnements_demo AS (
  SELECT a.*
  FROM abonnements a
  JOIN flottes_demo f ON f.id = a.fleet_id
),
droits_demo AS (
  SELECT dv.*
  FROM droits_vehicules dv
  JOIN vehicules_demo v ON v.id = dv.vehicle_id
),
addons_demo AS (
  SELECT * FROM addons WHERE code IN ('pulse_plus', 'qr_premium')
),
qr_demo AS (
  SELECT jq.*
  FROM jetons_qr jq
  JOIN vehicules_demo v ON v.id = jq.vehicle_id
  OR jq.fleet_id IN (SELECT id FROM flottes_demo)
)
SELECT
  'Organisation DEMO' AS element,
  CASE WHEN (SELECT COUNT(*) FROM org) = 1 THEN 'OK' ELSE 'MANQUANT' END AS statut,
  (SELECT COUNT(*) FROM org) AS nombre
UNION ALL
SELECT
  'Flottes DEMO',
  CASE WHEN (SELECT COUNT(*) FROM flottes_demo) = 3 THEN 'OK' ELSE 'INCOMPLET' END,
  (SELECT COUNT(*) FROM flottes_demo)
UNION ALL
SELECT
  'Véhicules DEMO',
  CASE WHEN (SELECT COUNT(*) FROM vehicules_demo) >= 5 THEN 'OK' ELSE 'INCOMPLET' END,
  (SELECT COUNT(*) FROM vehicules_demo)
UNION ALL
SELECT
  'Plans DEMO',
  CASE WHEN (SELECT COUNT(*) FROM plans_demo) = 3 THEN 'OK' ELSE 'INCOMPLET' END,
  (SELECT COUNT(*) FROM plans_demo)
UNION ALL
SELECT
  'Abonnements DEMO',
  CASE WHEN (SELECT COUNT(*) FROM abonnements_demo) >= 3 THEN 'OK' ELSE 'INCOMPLET' END,
  (SELECT COUNT(*) FROM abonnements_demo)
UNION ALL
SELECT
  'Droits véhicules DEMO',
  CASE WHEN (SELECT COUNT(*) FROM droits_demo) >= 5 THEN 'OK' ELSE 'INCOMPLET' END,
  (SELECT COUNT(*) FROM droits_demo)
UNION ALL
SELECT
  'Addons DEMO',
  CASE WHEN (SELECT COUNT(*) FROM addons_demo) >= 2 THEN 'OK' ELSE 'INCOMPLET' END,
  (SELECT COUNT(*) FROM addons_demo)
UNION ALL
SELECT
  'Jetons QR DEMO',
  CASE WHEN (SELECT COUNT(*) FROM qr_demo) >= 2 THEN 'OK' ELSE 'INCOMPLET' END,
  (SELECT COUNT(*) FROM qr_demo);

