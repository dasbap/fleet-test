# =====================================================
# Script de test des fonctions RPC
# Smart Fleet Africa - E-Samba
# =====================================================
# Ce script teste les trois fonctions RPC :
# 1. calculer_recette_attendue
# 2. calculer_score_conducteur
# 3. generer_alertes_automatiques
# =====================================================

param(
    [string]$SupabaseUrl = $env:SUPABASE_URL,
    [string]$SupabaseKey = $env:SUPABASE_ANON_KEY,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Usage: .\test-rpc-functions.ps1 [-SupabaseUrl <url>] [-SupabaseKey <key>] [-Help]

Paramètres:
  -SupabaseUrl    URL de votre projet Supabase (ou variable d'environnement SUPABASE_URL)
  -SupabaseKey    Clé anonyme Supabase (ou variable d'environnement SUPABASE_ANON_KEY)
  -Help           Affiche cette aide

Exemples:
  .\test-rpc-functions.ps1
  .\test-rpc-functions.ps1 -SupabaseUrl "https://xxx.supabase.co" -SupabaseKey "eyJ..."
"@
    exit 0
}

# Vérifier les variables d'environnement
if (-not $SupabaseUrl) {
    Write-Host "❌ Erreur: SUPABASE_URL non défini" -ForegroundColor Red
    Write-Host "   Définissez SUPABASE_URL ou utilisez -SupabaseUrl" -ForegroundColor Yellow
    exit 1
}

if (-not $SupabaseKey) {
    Write-Host "❌ Erreur: SUPABASE_ANON_KEY non défini" -ForegroundColor Red
    Write-Host "   Définissez SUPABASE_ANON_KEY ou utilisez -SupabaseKey" -ForegroundColor Yellow
    exit 1
}

# Chemin du script SQL
$scriptPath = Join-Path $PSScriptRoot "..\supabase\test-rpc-functions.sql"

if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Erreur: Script SQL non trouvé : $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DES FONCTIONS RPC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Script SQL : $scriptPath" -ForegroundColor Green
Write-Host "🔗 Supabase URL : $SupabaseUrl" -ForegroundColor Green
Write-Host ""

# Lire le contenu du script SQL
$sqlContent = Get-Content $scriptPath -Raw

# Préparer la requête
$headers = @{
    "apikey" = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sqlContent
} | ConvertTo-Json

try {
    Write-Host "⏳ Exécution des tests..." -ForegroundColor Yellow
    Write-Host ""
    
    # Exécuter la requête SQL via l'API REST de Supabase
    $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/execute_sql" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host "✅ Tests exécutés avec succès" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Résultats:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Note: L'API REST de Supabase ne supporte pas l'exécution directe de SQL." -ForegroundColor Yellow
    Write-Host "   Veuillez exécuter le script SQL manuellement dans le Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host "   1. Ouvrez https://app.supabase.com" -ForegroundColor Yellow
    Write-Host "   2. Sélectionnez votre projet" -ForegroundColor Yellow
    Write-Host "   3. Allez dans SQL Editor" -ForegroundColor Yellow
    Write-Host "   4. Copiez-collez le contenu de: $scriptPath" -ForegroundColor Yellow
    Write-Host "   5. Exécutez le script (Run ou Ctrl+Enter)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests terminés" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
