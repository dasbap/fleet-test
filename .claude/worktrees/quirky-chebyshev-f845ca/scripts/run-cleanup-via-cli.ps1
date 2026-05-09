# Connecter la CLI Supabase, lier le projet et exécuter les réparations (nettoyage base)
# Usage : depuis la racine du projet
#   npm run cleanup:db
#   ou : powershell -ExecutionPolicy Bypass -File scripts/run-cleanup-via-cli.ps1

$ErrorActionPreference = "Stop"
$projectRoot = if (Test-Path "package.json") { Get-Location } else { Join-Path $PSScriptRoot ".." }
Set-Location $projectRoot

$supabaseExe = Join-Path $projectRoot "node_modules\supabase\bin\supabase.exe"
$cleanupSql = Join-Path $projectRoot "supabase\cleanup-database-consistency.sql"
$projectRefFile = Join-Path $projectRoot "supabase\.temp\project-ref"

function Get-SupabaseExe {
    if (-not (Test-Path $supabaseExe)) {
        Write-Host "Installation de la CLI Supabase..." -ForegroundColor Cyan
        npm run install:supabase-cli
        if (-not (Test-Path $supabaseExe)) {
            Write-Host "ERREUR: supabase.exe introuvable après installation." -ForegroundColor Red
            exit 1
        }
    }
    return $supabaseExe
}

function Test-SupabaseLogin {
    $token = $env:SUPABASE_ACCESS_TOKEN
    if ($token -and $token.StartsWith("sbp_") -and $token.Length -gt 20) {
        return $true
    }
    Write-Host ""
    Write-Host "Connexion Supabase requise." -ForegroundColor Yellow
    Write-Host "  Exécutez une fois : npm run supabase -- login" -ForegroundColor White
    Write-Host "  (ouvre le navigateur pour obtenir un token, puis redémarrez le terminal)" -ForegroundColor Gray
    Write-Host ""
    return $false
}

function Invoke-SupabaseLink {
    $exe = Get-SupabaseExe
    $ref = $null
    if (Test-Path $projectRefFile) {
        $ref = (Get-Content $projectRefFile -Raw).Trim()
    }
    if (-not $ref) {
        $ref = "zqxjvmejoktwlcqshnwi"
        Write-Host "Utilisation du project-ref : $ref" -ForegroundColor Gray
    }
    Write-Host "Liaison au projet Supabase (ref: $ref)..." -ForegroundColor Cyan
    & $exe link --project-ref $ref --yes 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Échec du lien. Assurez-vous d'avoir exécuté : npm run supabase -- login" -ForegroundColor Red
        exit 1
    }
    Write-Host "Projet lié." -ForegroundColor Green
}

function Invoke-CleanupWithPsql {
    $dbUrl = $env:SUPABASE_DB_URL
    $dbPassword = $env:SUPABASE_DB_PASSWORD
    $ref = (Get-Content $projectRefFile -Raw).Trim()
    $poolerUrl = (Get-Content (Join-Path $projectRoot "supabase\.temp\pooler-url") -Raw).Trim()

    if ($dbUrl) {
        $conn = $dbUrl
        $env:PGPASSWORD = $null
    } elseif ($dbPassword) {
        $conn = $poolerUrl -replace "postgres\.([^@]+)@", "postgres.`$1:$dbPassword@"
        $env:PGPASSWORD = $dbPassword
    } else {
        return $false
    }

    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psql) {
        Write-Host "psql (PostgreSQL) non trouvé. Exécution SQL impossible depuis ce script." -ForegroundColor Yellow
        return $false
    }

    Write-Host "Exécution du script de nettoyage via psql..." -ForegroundColor Cyan
    & psql $conn -f $cleanupSql 2>&1
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    return $true
}

# --- Main ---
Write-Host "=== Nettoyage base de données (réparations) ===" -ForegroundColor Cyan
Write-Host ""

Get-SupabaseExe | Out-Null

if (-not (Test-SupabaseLogin)) {
    Write-Host "Après connexion, relancez ce script." -ForegroundColor Yellow
    Write-Host "Pour lier manuellement : npm run supabase -- link --project-ref zqxjvmejoktwlcqshnwi" -ForegroundColor Gray
    exit 1
}

Invoke-SupabaseLink

# Tenter exécution via psql si variables définies
$done = Invoke-CleanupWithPsql
if ($done) {
    Write-Host ""
    Write-Host "Nettoyage exécuté. Vérifiez les résultats ci-dessus." -ForegroundColor Green
    exit 0
}

# Sinon : ouvrir le fichier et rappeler la procédure Dashboard
Write-Host ""
Write-Host "Exécution des réparations (2 options) :" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1 - Supabase Dashboard (recommandé) :" -ForegroundColor Cyan
Write-Host "  1. Ouvrez https://supabase.com/dashboard → votre projet → SQL Editor" -ForegroundColor White
Write-Host "  2. Copiez tout le contenu de : supabase\cleanup-database-consistency.sql" -ForegroundColor White
Write-Host "  3. Collez dans l'éditeur et exécutez (Run)" -ForegroundColor White
Write-Host "  4. Puis exécutez : SELECT nettoyer_base_donnees(true);  (simulation)" -ForegroundColor White
Write-Host "  5. Puis exécutez : SELECT nettoyer_base_donnees(false);   (réparations réelles)" -ForegroundColor White
Write-Host ""
Write-Host "Option 2 - Ligne de commande (si PostgreSQL installé) :" -ForegroundColor Cyan
Write-Host "  Définissez SUPABASE_DB_PASSWORD ou SUPABASE_DB_URL puis relancez ce script." -ForegroundColor White
Write-Host ""

# Ouvrir le fichier SQL dans l'éditeur par défaut
if (Test-Path $cleanupSql) {
    Start-Process $cleanupSql
}
Write-Host "Fichier SQL ouvert." -ForegroundColor Green
