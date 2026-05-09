# =====================================================
# Script d'examen automatisé de la création d'un utilisateur test
# Smart Fleet Africa
# =====================================================
# Ce script :
# 1. Crée ou vérifie l'existence d'un utilisateur test via l'API Admin Supabase
# 2. Propose d'exécuter le script SQL d'intégration
# =====================================================

param(
    [string]$SupabaseUrl = "",
    [string]$ServiceRoleKey = "",
    [string]$Email = "utilisateur_test@example.com",
    [string]$Password = "Test1234!@#$",
    [string]$FullName = "Utilisateur Test"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EXAMEN DE L'UTILISATEUR TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Chargement des variables d'environnement si besoin
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

if ([string]::IsNullOrEmpty($SupabaseUrl)) {
    $SupabaseUrl = $env:VITE_SUPABASE_URL
}
if ([string]::IsNullOrEmpty($ServiceRoleKey)) {
    $ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
}
if ([string]::IsNullOrEmpty($SupabaseUrl) -or [string]::IsNullOrEmpty($ServiceRoleKey)) {
    Write-Host "❌ Variables d'environnement ou paramètres manquants : VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    exit 1
}
$projectRef = ""
if ($SupabaseUrl -match 'https://([^.]+)\.supabase\.co') { $projectRef = $matches[1] }
else { Write-Host "❌ URL Supabase invalide" -ForegroundColor Red; exit 1 }

Write-Host "Configuration vérifiée:" -ForegroundColor Green
Write-Host "   Supabase: $SupabaseUrl" -ForegroundColor White
Write-Host "   Project Ref: $projectRef" -ForegroundColor White
Write-Host "   Email: $Email" -ForegroundColor White
Write-Host ""

# 1. Vérification de l'existence de l'utilisateur
Write-Host "Vérification de l'utilisateur test..." -ForegroundColor Yellow
$encodedEmail = [System.Uri]::EscapeDataString($Email)
$checkUserUrl = "$SupabaseUrl/auth/v1/admin/users?email=$encodedEmail"
$headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
}
$userExists = $false
try {
    $response = Invoke-RestMethod -Uri $checkUserUrl -Method Get -Headers $headers -ErrorAction Stop
    if ($response.users -and $response.users.Count -gt 0) {
        Write-Host "✅ Utilisateur déjà présent dans Supabase" -ForegroundColor Green
        Write-Host ("   User ID: {0}" -f $response.users[0].id) -ForegroundColor White
        $userExists = $true
    }
} catch {
    Write-Host "⚠️  Impossible de vérifier la présence utilisateur. Tentative de création..." -ForegroundColor Yellow
}

# 2. Création si absent
if (-not $userExists) {
    Write-Host "Création de l'utilisateur test..." -ForegroundColor Yellow
    $createUserUrl = "$SupabaseUrl/auth/v1/admin/users"
    $body = @{
        email = $Email
        password = $Password
        email_confirm = $true
        user_metadata = @{ full_name = $FullName }
    } | ConvertTo-Json
    try {
        $newUser = Invoke-RestMethod -Uri $createUserUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "✅ Utilisateur créé: $($newUser.id)" -ForegroundColor Green
    } catch {
        $errorMessage = $_.Exception.Message
        if ($_.ErrorDetails.Message) {
            try { $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json; $errorMessage = $errorDetails.message } catch { }
        }
        if ($errorMessage -match "already registered" -or $errorMessage -match "already exists") {
            Write-Host "ℹ️  L'utilisateur existait déjà (créé durant la vérification)" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Erreur à la création : $errorMessage" -ForegroundColor Red
            exit 1
        }
    }
}

# Petite pause pour la propagation
Start-Sleep -Seconds 2

# 3. Proposition d'exécution du SQL
$sqlScriptPath = "supabase\create-test-user-complete.sql"
if (-not (Test-Path $sqlScriptPath)) {
    Write-Host "❌ Script SQL introuvable : $sqlScriptPath" -ForegroundColor Red
    Write-Host "Veuillez exécuter manuellement ce SQL dans Supabase SQL Editor." -ForegroundColor Yellow
    exit 1
}

Write-Host "➡️  Script SQL prêt : $sqlScriptPath" -ForegroundColor Green
Write-Host "INSTRUCTIONS : " -ForegroundColor Cyan
Write-Host " 1. Ouvrez : https://app.supabase.com -> Projet -> SQL Editor"
Write-Host " 2. Copiez-collez supabase\create-test-user-complete.sql puis exécutez-le (F5)"
Write-Host " 3. Vérifiez l'absence d'erreurs lors du run."
Write-Host ""

# Ouvrir fichier SQL si souhaité
$openFile = Read-Host "Ouvrir le fichier SQL dans votre éditeur (O/n) ?"
if ($openFile -ne "n" -and $openFile -ne "N") {
    if (Get-Command code -ErrorAction SilentlyContinue) { code $sqlScriptPath }
    elseif (Get-Command notepad -ErrorAction SilentlyContinue) { notepad $sqlScriptPath }
    else { Write-Host "Ouvrez manuellement: $sqlScriptPath" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "Résumé :" -ForegroundColor Cyan
Write-Host "   ✅ Compte Supabase prêt : $Email" -ForegroundColor Green
Write-Host "   🔑 Mot de passe : $Password" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes :" -ForegroundColor Yellow
Write-Host " 1. Exécuter le script SQL indiqué ci-dessus"
Write-Host " 2. Tester la connexion avec l'email/mot de passe"
Write-Host " 3. Lire GUIDE-CREATION-UTILISATEUR-TEST.md si besoin"
