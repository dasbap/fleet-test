# Test SQL CI du tunnel de conversion (staging).
# - Exécute le script SQL PASS/FAIL
# - Échoue (exit 1) si résultat global = FAIL

param(
    [string]$SqlFile = "supabase/scripts/test/test-conversion-tunnel-steps-staging-ci.sql",
    [ValidateSet("linked", "local")]
    [string]$Target = "linked"
)

$ErrorActionPreference = "Continue"

Write-Host "=== Test SQL CI: conversion tunnel ===" -ForegroundColor Cyan

if (-not (Test-Path $SqlFile)) {
    Write-Host "ERREUR: fichier SQL introuvable: $SqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Fichier SQL: $SqlFile" -ForegroundColor Gray
Write-Host "Cible Supabase: --$Target" -ForegroundColor Gray

$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
$useNpx = $false

if (-not $supabaseCmd) {
    Write-Host "Supabase CLI globale non trouvée, utilisation de npx supabase." -ForegroundColor Yellow
    $useNpx = $true
}

if ($Target -eq "local") {
    $containerName = "supabase_db_smart-fleet-africa"
    $sqlRaw = Get-Content -Path $SqlFile -Raw
    $output = $sqlRaw | docker exec -i $containerName psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
}
else {
    if ($useNpx) {
        $output = & npx supabase db query --$Target --file "$SqlFile" -o json 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
    }
    else {
        $output = & supabase db query --$Target --file "$SqlFile" -o json 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
    }
}

$outputText = $output
Write-Host $outputText

if ($exitCode -ne 0) {
    Write-Host "ERREUR: exécution SQL échouée (code $exitCode)." -ForegroundColor Red
    exit $exitCode
}

if ($outputText -match "(?im)""global_status""\s*:\s*""FAIL""" -or $outputText -match "(?im)^\s*FAIL\s*\|\s*\d+\s*\|\s*\d+\s*$") {
    Write-Host "ERREUR: global_status=FAIL détecté." -ForegroundColor Red
    exit 1
}

if ($outputText -match "(?im)""global_status""\s*:\s*""PASS""" -or $outputText -match "(?im)^\s*PASS\s*\|\s*\d+\s*\|\s*\d+\s*$") {
    Write-Host "OK: global_status=PASS" -ForegroundColor Green
    exit 0
}

Write-Host "ERREUR: statut global introuvable dans la sortie SQL." -ForegroundColor Red
exit 1
