Param(
  [string]$Host = $env:PGHOST,
  [string]$Port = $env:PGPORT,
  [string]$Database = $env:PGDATABASE,
  [string]$User = $env:PGUSER,
  [string]$Password = $env:PGPASSWORD
)

if (-not $Host) { $Host = "127.0.0.1" }
if (-not $Port) { $Port = "54322" }
if (-not $Database) { $Database = "postgres" }
if (-not $User) { $User = "postgres" }

if (-not $Password) {
  Write-Host "Mot de passe Postgres (PGPASSWORD non défini) :" -ForegroundColor Yellow
  $secure = Read-Host -AsSecureString
  $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

$env:PGHOST = $Host
$env:PGPORT = $Port
$env:PGDATABASE = $Database
$env:PGUSER = $User
$env:PGPASSWORD = $Password

function Invoke-DbQuery {
  param(
    [string]$Sql,
    [string]$Title
  )

  if ($Title) {
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
  }

  psql -v ON_ERROR_STOP=1 -c $Sql
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Erreur lors de l'exécution de la requête : $Title"
    exit $LASTEXITCODE
  }
}

Write-Host "Connexion à la base PostgreSQL $Database sur $Host:$Port (utilisateur: $User)..." -ForegroundColor Green

Invoke-DbQuery -Title "Rapport cohérence (orphelins / doublons / incohérences)" -Sql @"
-- Rapport cohérence base Smart Fleet Africa
-- SECTION 1 : rapports agrégés

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
) t;

-- 1.2 Doublons
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
) t;

-- 1.3 Entrées inutiles
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
) t;

-- 1.4 Incohérences logiques
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
) t;
"@

Invoke-DbQuery -Title "Simulation nettoyage (nettoyer_base_donnees(true))" -Sql "SELECT nettoyer_base_donnees(true) AS simulation;"

$answer = Read-Host "Continuer avec le nettoyage réel ? (o/N)"
if ($answer -match '^[oO]$') {
  Invoke-DbQuery -Title "Nettoyage réel (nettoyer_base_donnees(false))" -Sql "SELECT nettoyer_base_donnees(false) AS nettoyage_reel;"
  Write-Host "Nettoyage terminé." -ForegroundColor Green
} else {
  Write-Host "Nettoyage réel annulé. Aucune suppression effectuée." -ForegroundColor Yellow
}

