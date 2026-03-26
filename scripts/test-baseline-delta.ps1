# =====================================================
# Validation baseline + deltas (local)
# =====================================================

$ErrorActionPreference = "Stop"

$baselineFile = "supabase/baseline/00000000000000_baseline_schema.sql"
$deltaListFile = "supabase/baseline/delta-migrations.txt"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST BASELINE + DELTAS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "INFO: Supabase CLI globale introuvable, utilisation via npx." -ForegroundColor Yellow
}

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

function Invoke-SupabaseCommand {
    param(
        [string[]]$CommandArgs
    )

    & npx supabase @CommandArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Commande Supabase en echec: npx supabase $($CommandArgs -join ' ')"
    }
}

$tempRoot = "supabase/migrations_tmp_baseline_test"
$legacyRoot = "supabase/migrations_legacy_saved"
$migrationsRoot = "supabase/migrations"
$migrationSwapped = $false

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
    Write-Host "1) Demarrage stack locale Supabase..." -ForegroundColor Cyan
    Invoke-SupabaseCommand -CommandArgs @("start")

    Write-Host "2) Preparation d une chaine migrations temporaire baseline+deltas..." -ForegroundColor Cyan
    Move-Item $migrationsRoot $legacyRoot
    Move-Item $tempRoot $migrationsRoot
    $migrationSwapped = $true

    Write-Host "3) Reset local sans seed (baseline+deltas)..." -ForegroundColor Cyan
    Invoke-SupabaseCommand -CommandArgs @("db", "reset", "--no-seed")

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
}
