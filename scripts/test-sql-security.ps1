# =====================================================
# Tests SQL sécurité RLS/RPC (local + linked)
# Local : stack Docker Supabase + migrations (CLI ou fallback Docker).
# =====================================================

param(
  [ValidateSet("linked", "local")]
  [string]$Target = "local",
  [switch]$ResetDatabase
)

$ErrorActionPreference = "Stop"

$ProjectId = "smart-fleet-africa"
$DbContainerName = "supabase_db_$ProjectId"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$MigrationsDir = Join-Path $RepoRoot "supabase\migrations"

$tests = @(
  "supabase/tests/01_security_invariants.sql",
  "supabase/tests/02_policy_coverage.sql",
  "supabase/tests/03_invitation_guardrails.sql",
  "supabase/tests/04_post_migration_objects.sql",
  "supabase/tests/05_affectations_vehicules_schema.sql",
  "supabase/tests/07_fermer_creneau_behavior.sql",
  "supabase/tests/08_vehicle_limit_billing.sql"
)

function Repair-SupabaseTelemetryJson {
  $paths = @()
  if (-not [string]::IsNullOrWhiteSpace($env:APPDATA)) {
    $paths += Join-Path $env:APPDATA "supabase\telemetry.json"
  }
  if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
    $paths += Join-Path $env:USERPROFILE ".supabase\telemetry.json"
  }

  foreach ($telemetryPath in $paths) {
    if (-not (Test-Path $telemetryPath)) {
      continue
    }

    try {
      $raw = Get-Content -Path $telemetryPath -Raw -ErrorAction Stop
      $null = $raw | ConvertFrom-Json
    }
    catch {
      Write-Host "INFO: telemetry.json invalide ($telemetryPath), regeneration..." -ForegroundColor Yellow
      $dir = Split-Path $telemetryPath -Parent
      if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
      }
      $payload = @{
        enabled = $true
        device_id = [guid]::NewGuid().ToString()
        session_id = [guid]::NewGuid().ToString()
        session_last_active = (Get-Date).ToUniversalTime().ToString("o")
        schema_version = 1
      } | ConvertTo-Json -Compress
      $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
      [System.IO.File]::WriteAllText($telemetryPath, $payload, $utf8NoBom)
    }
  }
}

function Test-SupabaseCliAvailable {
  Repair-SupabaseTelemetryJson
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & npx supabase --version *> $null
    return $LASTEXITCODE -eq 0
  }
  finally {
    $ErrorActionPreference = $prevEap
  }
}

function Invoke-SupabaseCommand {
  param([string[]]$CommandArgs)
  Repair-SupabaseTelemetryJson
  if ($env:CI_SUPABASE_DEBUG -eq "true") {
    $CommandArgs = @($CommandArgs + "--debug")
  }
  & npx supabase @CommandArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Commande Supabase en echec: npx supabase $($CommandArgs -join ' ')"
  }
}

function Wait-DbContainerHealthy {
  param([int]$TimeoutSec = 180)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  do {
    $status = docker inspect --format='{{.State.Health.Status}}' $DbContainerName 2>$null
    if ($status -eq "healthy") {
      return
    }
    Start-Sleep -Seconds 3
  } while ((Get-Date) -lt $deadline)
  throw "Conteneur $DbContainerName non healthy (statut: $status)"
}

function Test-DbContainerRunning {
  $status = docker inspect --format='{{.State.Status}}' $DbContainerName 2>$null
  return $status -eq "running"
}

function Ensure-SupabaseDbRunning {
  if (Test-DbContainerRunning) {
    Wait-DbContainerHealthy
    return
  }

  if (Test-SupabaseCliAvailable) {
    Write-Host "INFO: Demarrage stack via Supabase CLI..." -ForegroundColor Yellow
    Invoke-SupabaseCommand -CommandArgs @("start", "-x", "vector,logflare")
    Wait-DbContainerHealthy
    return
  }

  throw "Conteneur $DbContainerName absent et Supabase CLI indisponible. Lancez Docker Desktop puis 'npx supabase start' une fois, ou reinstallez la CLI."
}

function Invoke-DbScalar {
  param([string]$Sql)
  $result = docker exec $DbContainerName psql -U postgres -d postgres -tA -c $Sql 2>$null
  if ($LASTEXITCODE -ne 0) {
    return $null
  }
  return ($result | Out-String).Trim()
}

function Test-DatabaseMigrationReady {
  $ready = Invoke-DbScalar -Sql @"
SELECT CASE
  WHEN to_regprocedure('public.get_fleet_billing_context_internal(uuid)') IS NOT NULL
   AND to_regclass('public.onboarding_sequence_log') IS NOT NULL
  THEN 'ok' ELSE 'missing' END;
"@
  return $ready -eq "ok"
}

function Apply-LocalMigrations {
  if (-not (Test-Path $MigrationsDir)) {
    throw "Dossier migrations introuvable: $MigrationsDir"
  }

  $files = Get-ChildItem $MigrationsDir -Filter "*.sql" | Sort-Object Name
  Write-Host "Application migrations Docker ($($files.Count) fichiers)..." -ForegroundColor Cyan

  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $applied = 0
    foreach ($file in $files) {
      Get-Content $file.FullName -Raw | docker exec -i $DbContainerName psql -U postgres -d postgres -v ON_ERROR_STOP=0 *> $null
      if ($LASTEXITCODE -eq 0) {
        $applied++
      }
    }
    Write-Host "Migrations traitees: $applied/$($files.Count)" -ForegroundColor Gray
  }
  finally {
    $ErrorActionPreference = $prevEap
  }

  if (-not (Test-DatabaseMigrationReady)) {
    throw "Schema incomplet apres migrations Docker (objets billing/onboarding manquants)."
  }
}

function Reset-LocalDatabase {
  if (Test-SupabaseCliAvailable) {
    try {
      Write-Host "Reset DB via Supabase CLI..." -ForegroundColor Cyan
      Invoke-SupabaseCommand -CommandArgs @("db", "reset", "--no-seed")
      return
    }
    catch {
      Write-Host "INFO: db reset CLI echoue, fallback Docker..." -ForegroundColor Yellow
    }
  }
  else {
    Write-Host "INFO: Supabase CLI indisponible, fallback Docker..." -ForegroundColor Yellow
  }

  Apply-LocalMigrations
}

function Invoke-LocalSqlFile {
  param([string]$SqlFile)
  $sqlRaw = Get-Content -Path $SqlFile -Raw
  $output = $sqlRaw | docker exec -i $DbContainerName psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "Echec SQL local pour '$SqlFile': $output"
  }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTS SQL SECURITE (RLS/RPC)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cible Supabase: $Target" -ForegroundColor Gray

foreach ($testFile in $tests) {
  if (-not (Test-Path $testFile)) {
    Write-Host "ERREUR: Fichier de test introuvable: $testFile" -ForegroundColor Red
    exit 1
  }
}

try {
  if ($Target -eq "local") {
    Write-Host "1) Verification stack Supabase locale (Docker)..." -ForegroundColor Cyan
    Ensure-SupabaseDbRunning

    if ($ResetDatabase -or -not $PSBoundParameters.ContainsKey("ResetDatabase")) {
      Write-Host "1b) Preparation schema (reset CLI ou migrations Docker)..." -ForegroundColor Cyan
      if (Test-SupabaseCliAvailable) {
        Reset-LocalDatabase
      }
      elseif (-not (Test-DatabaseMigrationReady)) {
        Reset-LocalDatabase
      }
      else {
        Write-Host "INFO: Schema deja pret, skip reset (CLI indisponible)." -ForegroundColor Gray
      }
    }
  }
  elseif ($ResetDatabase) {
    Write-Host "1) Reset DB linked demande..." -ForegroundColor Cyan
    Invoke-SupabaseCommand -CommandArgs @("db", "reset", "--linked", "--no-seed")
  }

  Write-Host "2) Execution des tests SQL..." -ForegroundColor Cyan
  foreach ($testFile in $tests) {
    Write-Host " - $testFile" -ForegroundColor DarkCyan
    if ($Target -eq "local") {
      Invoke-LocalSqlFile -SqlFile $testFile
    }
    else {
      Invoke-SupabaseCommand -CommandArgs @("db", "query", "--linked", "--file", $testFile)
    }
  }

  Write-Host ""
  Write-Host "OK: Tous les tests SQL securite sont passes." -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "ERREUR: Echec des tests SQL securite." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  exit 1
}
