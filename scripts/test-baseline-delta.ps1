# =====================================================
# Validation baseline + deltas (local)
# =====================================================

param(
    [ValidateSet("linked", "local")]
    [string]$Target = "local"
)

$ErrorActionPreference = "Stop"

$baselineFile = "supabase/baseline/00000000000000_baseline_schema.sql"
$deltaListFile = "supabase/baseline/delta-migrations.txt"
$configFile = "supabase/config.toml"
$portsHelper = Join-Path $PSScriptRoot "_local-supabase-ports.ps1"
$searchFleetMigrationCandidates = @(
    "supabase/migrations/20260415193000_unified_fleet_search.sql",
    "supabase/supabase/migrations/20260415193000_unified_fleet_search.sql"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST BASELINE + DELTAS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Target -eq "linked") {
    Write-Host "INFO: test-baseline-delta ne s'exécute qu'en local (manipule la stack Docker/migrations locale)." -ForegroundColor Yellow
    Write-Host "INFO: Étape ignorée en mode linked." -ForegroundColor Yellow
    exit 0
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "INFO: Supabase CLI globale introuvable, utilisation via npx." -ForegroundColor Yellow
}

if (-not (Test-Path $portsHelper)) {
    Write-Host "ERREUR: Helper ports Supabase introuvable: $portsHelper" -ForegroundColor Red
    exit 1
}

. $portsHelper

if (-not (Test-Path $baselineFile)) {
    Write-Host "ERREUR: Baseline introuvable: $baselineFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $deltaListFile)) {
    Write-Host "ERREUR: Liste des deltas introuvable: $deltaListFile" -ForegroundColor Red
    exit 1
}

$deltas = Get-Content $deltaListFile | Where-Object { $_ -and -not $_.StartsWith("#") }
if ($deltas.Count -eq 0) {
    Write-Host "ERREUR: Aucun delta defini dans $deltaListFile" -ForegroundColor Red
    exit 1
}

$searchFleetMigrationFile = $searchFleetMigrationCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($null -eq $searchFleetMigrationFile) {
    Write-Host "ERREUR: Migration search_fleet introuvable dans les emplacements attendus." -ForegroundColor Red
    exit 1
}

$searchFleetMigrationSql = Get-Content $searchFleetMigrationFile -Raw

function Invoke-SupabaseCommand {
    param(
        [string[]]$CommandArgs
    )

    if ($env:CI_SUPABASE_DEBUG -eq "true") {
        $CommandArgs = @($CommandArgs + "--debug")
    }

    & npx supabase @CommandArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Commande Supabase en echec: npx supabase $($CommandArgs -join ' ')"
    }
}

function Invoke-DbScalar {
    param(
        [string]$Sql
    )

    $result = & docker exec supabase_db_smart-fleet-africa psql -U postgres -d postgres -tA -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "Commande SQL en echec: $Sql"
    }

    return ($result | Out-String).Trim()
}

$tempRoot = "supabase/migrations_tmp_baseline_test"
$legacyRoot = "supabase/migrations_legacy_saved"
$migrationsRoot = "supabase/migrations"
$migrationSwapped = $false
$supabaseConfigBackupPath = $null

if (Test-Path $tempRoot) { Remove-Item -Path $tempRoot -Recurse -Force }
if (Test-Path $legacyRoot) { Remove-Item -Path $legacyRoot -Recurse -Force }

New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

$baselineTarget = Join-Path $tempRoot "00000000000000_baseline_schema.sql"
Copy-Item $baselineFile $baselineTarget -Force

$order = 1
foreach ($delta in $deltas) {
    if (-not (Test-Path $delta)) {
        Write-Host "ERREUR: Delta manquant: $delta" -ForegroundColor Red
        exit 1
    }

    $targetName = "0000000000000$($order)_delta_$(Split-Path $delta -Leaf)"
    Copy-Item $delta (Join-Path $tempRoot $targetName) -Force
    $order++
}

try {
    if (Test-Path $configFile) {
        $portConfig = Set-LocalSupabaseTestPorts -ConfigFile $configFile -DisableStorage
        $supabaseConfigBackupPath = $portConfig.BackupPath
        Write-Host "INFO: Ports Supabase locaux temporaires: api=$($portConfig.Ports.api), db=$($portConfig.Ports.db), studio=$($portConfig.Ports.studio), inbucket=$($portConfig.Ports.inbucket), analytics=$($portConfig.Ports.analytics)." -ForegroundColor Yellow
        Write-Host "INFO: Storage desactive temporairement pour isoler la validation SQL baseline+deltas." -ForegroundColor Yellow
    }

    Write-Host "0) Nettoyage stack Supabase existante..." -ForegroundColor Cyan
    try {
        Invoke-SupabaseCommand -CommandArgs @("stop", "--no-backup")
    }
    catch {
        Write-Host "INFO: Aucun stack actif a stopper (ou arret deja effectue)." -ForegroundColor DarkYellow
    }

    Write-Host "1) Preparation d une chaine migrations temporaire baseline+deltas..." -ForegroundColor Cyan
    Move-Item $migrationsRoot $legacyRoot
    Move-Item $tempRoot $migrationsRoot
    $migrationSwapped = $true

    Write-Host "2) Demarrage stack locale Supabase (sans vector/logflare)..." -ForegroundColor Cyan
    Invoke-SupabaseCommand -CommandArgs @("start", "-x", "vector,logflare")

    Write-Host "3) Reset local sans seed (baseline+deltas)..." -ForegroundColor Cyan
    Invoke-SupabaseCommand -CommandArgs @("db", "reset", "--no-seed")

    Write-Host "4) Application migration search_fleet (avec guards CREATE TABLE IF NOT EXISTS)..." -ForegroundColor Cyan
    # La migration contient ses propres CREATE TABLE IF NOT EXISTS pour toutes les
    # tables dont elle dépend. On l'applique directement sans vérification préalable
    # des tables : elles sont créées à la volée si absentes du baseline+deltas.
    $searchFleetMigrationSql | docker exec -i supabase_db_smart-fleet-africa psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f -
    if ($LASTEXITCODE -ne 0) {
        throw "Echec application migration search_fleet: $searchFleetMigrationFile"
    }

    $searchFleetExists = Invoke-DbScalar -Sql "select to_regprocedure('public.search_fleet(text,integer,uuid)') is not null;"
    if ($searchFleetExists -ne "t") {
        throw "RPC search_fleet absente apres migration."
    }

    $searchFleetResultCount = Invoke-DbScalar -Sql "select count(*) from public.search_fleet('test'::text, 5::int, null::uuid);"
    if (-not ($searchFleetResultCount -match '^\d+$')) {
        throw "RPC search_fleet non exploitable: resultat invalide '$searchFleetResultCount'."
    }

    Write-Host "OK: RPC search_fleet executee (count=$searchFleetResultCount)." -ForegroundColor Green

    Write-Host ""
    Write-Host "OK: Validation baseline + deltas terminee avec succes." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "ERREUR: Echec de la validation baseline+deltas." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}
finally {
    if ($migrationSwapped) {
        if (Test-Path $migrationsRoot) {
            Remove-Item -Path $migrationsRoot -Recurse -Force
        }
        if (Test-Path $legacyRoot) {
            Move-Item $legacyRoot $migrationsRoot
        }
    }
    if (Test-Path $tempRoot) {
        Remove-Item -Path $tempRoot -Recurse -Force
    }
    if ($null -ne $supabaseConfigBackupPath) {
        try {
            Invoke-SupabaseCommand -CommandArgs @("stop", "--no-backup")
        }
        catch {
            Write-Host "INFO: Arret stack Supabase ignore pendant le nettoyage." -ForegroundColor DarkYellow
        }
    }
    Restore-LocalSupabaseConfig -ConfigFile $configFile -BackupPath $supabaseConfigBackupPath
}
