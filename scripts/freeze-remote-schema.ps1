# =====================================================
# Freeze remote Supabase schema snapshot
# =====================================================
# Exporte un snapshot de référence (schema/fonctions/roles)
# depuis la base distante liée pour préparer une baseline fiable.
# =====================================================

param(
    [string]$OutputDir = "supabase/snapshots"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FREEZE REMOTE SCHEMA SNAPSHOT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "INFO: Supabase CLI globale introuvable, utilisation via npx." -ForegroundColor Yellow
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

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$snapshotDir = Join-Path $OutputDir $timestamp

New-Item -ItemType Directory -Path $snapshotDir -Force | Out-Null

$schemaFile = Join-Path $snapshotDir "schema.sql"
$rolesFile = Join-Path $snapshotDir "roles.sql"
$summaryFile = Join-Path $snapshotDir "summary.txt"

Write-Host "Dossier snapshot: $snapshotDir" -ForegroundColor Yellow
Write-Host ""

try {
    Write-Host "1) Export du schéma distant..." -ForegroundColor Cyan
    Invoke-SupabaseCommand -CommandArgs @("db", "dump", "--linked", "--schema", "public", "--file", $schemaFile)

    Write-Host "2) Export des rôles/grants..." -ForegroundColor Cyan
    Invoke-SupabaseCommand -CommandArgs @("db", "dump", "--linked", "--role-only", "--file", $rolesFile)

    $summary = @(
        "snapshot_timestamp=$timestamp"
        "schema_file=$schemaFile"
        "roles_file=$rolesFile"
        "cli_version=$(npx supabase --version)"
    )
    $summary | Out-File -FilePath $summaryFile -Encoding utf8

    Write-Host ""
    Write-Host "OK: Snapshot distant genere avec succes." -ForegroundColor Green
    Write-Host "   - $schemaFile" -ForegroundColor Gray
    Write-Host "   - $rolesFile" -ForegroundColor Gray
    Write-Host "   - $summaryFile" -ForegroundColor Gray
}
catch {
    Write-Host ""
    Write-Host "ERREUR: Echec pendant l export du snapshot distant." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}
