# =====================================================
# Validation baseline + deltas (local)
# =====================================================

$ErrorActionPreference = "Stop"

$baselineFile = "supabase/baseline/00000000000000_baseline_schema.sql"
$deltaListFile = "supabase/baseline/delta-migrations.txt"
$configFile = "supabase/config.toml"

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

function Test-PortAvailable {
    param(
        [int]$Port
    )

    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($null -ne $listener) {
            $listener.Stop()
        }
    }
}

$tempRoot = "supabase/migrations_tmp_baseline_test"
$legacyRoot = "supabase/migrations_legacy_saved"
$migrationsRoot = "supabase/migrations"
$migrationSwapped = $false
$configBackupPath = $null

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
        $originalDbPort = 54322
        $targetDbPort = $originalDbPort
        if (-not (Test-PortAvailable -Port $originalDbPort)) {
            $fallbackPorts = @(54332, 54333, 54334, 54335, 54336, 54337, 54338, 54339, 54340)
            $freePort = $fallbackPorts | Where-Object { Test-PortAvailable -Port $_ } | Select-Object -First 1
            if ($null -eq $freePort) {
                throw "Aucun port DB libre trouvé pour Supabase local."
            }
            $targetDbPort = [int]$freePort
        }

        if ($targetDbPort -ne $originalDbPort) {
            Write-Host "INFO: Port 54322 occupe, bascule temporaire sur le port $targetDbPort." -ForegroundColor Yellow
            $configBackupPath = "$configFile.ci-backup"
            Copy-Item $configFile $configBackupPath -Force
            $configRaw = Get-Content $configFile -Raw
            $configRaw = $configRaw -replace '(?ms)(\[db\]\s*.*?port\s*=\s*)\d+', "`$1$targetDbPort"
            Set-Content -Path $configFile -Value $configRaw -Encoding UTF8
        }
    }

    Write-Host "0) Nettoyage stack Supabase existante..." -ForegroundColor Cyan
    try {
        Invoke-SupabaseCommand -CommandArgs @("stop", "--no-backup")
    }
    catch {
        Write-Host "INFO: Aucun stack actif a stopper (ou arret deja effectue)." -ForegroundColor DarkYellow
    }

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
    if ($null -ne $configBackupPath -and (Test-Path $configBackupPath)) {
        Move-Item -Path $configBackupPath -Destination $configFile -Force
    }
}
