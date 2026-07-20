# =====================================================
# Orchestrateur tests d'intégration SQL Supabase
# - Auto: CI=true => linked, sinon local
# - Suite: conversion + sécurité + baseline(delta)
# =====================================================

param(
    [ValidateSet("auto", "linked", "local")]
    [string]$Target = "auto",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Resolve-TargetMode {
    param([string]$RequestedTarget)

    if ($RequestedTarget -ne "auto") {
        return $RequestedTarget
    }

    $ciValue = [string]$env:CI
    if (-not [string]::IsNullOrWhiteSpace($ciValue)) {
        $normalized = $ciValue.Trim().ToLowerInvariant()
        if ($normalized -eq "1" -or $normalized -eq "true" -or $normalized -eq "yes") {
            return "linked"
        }
    }

    return "local"
}

function Invoke-Step {
    param(
        [string]$Label,
        [scriptblock]$Action
    )

    Write-Host ""
    Write-Host ">>> $Label" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Host "DRY-RUN: étape ignorée." -ForegroundColor Yellow
        return
    }
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "Echec étape '$Label' (exit=$LASTEXITCODE)."
    }
    Write-Host "OK: $Label" -ForegroundColor Green
}

$resolvedTarget = Resolve-TargetMode -RequestedTarget $Target

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST INTEGRATION SUPABASE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Target demandé : $Target" -ForegroundColor Gray
Write-Host "Target résolu : $resolvedTarget" -ForegroundColor Gray
if ($DryRun) {
    Write-Host "Mode DRY-RUN : aucune commande SQL ne sera exécutée." -ForegroundColor Yellow
}

try {
    Invoke-Step -Label "Conversion tunnel SQL" -Action {
        & powershell -ExecutionPolicy Bypass -File "scripts/test-conversion-tunnel-ci.ps1" -Target $resolvedTarget
    }

    if ($resolvedTarget -eq "local") {
        Invoke-Step -Label "Sécurité SQL (RLS/RPC)" -Action {
            & powershell -ExecutionPolicy Bypass -File "scripts/test-sql-security.ps1" -Target local -ResetDatabase
        }
    }
    else {
        Invoke-Step -Label "Sécurité SQL (RLS/RPC) linked" -Action {
            & powershell -ExecutionPolicy Bypass -File "scripts/test-sql-security.ps1" -Target linked
        }
    }

    Invoke-Step -Label "Baseline + deltas" -Action {
        & powershell -ExecutionPolicy Bypass -File "scripts/test-baseline-delta.ps1" -Target $resolvedTarget
    }

    Write-Host ""
    Write-Host "SUCCES: Suite test:integration:supabase terminée." -ForegroundColor Green
    exit 0
}
catch {
    Write-Host ""
    Write-Host "ERREUR: Suite test:integration:supabase en échec." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}
