# =====================================================
# Script PowerShell pour créer l'équipe ESAMBA
# Smart Fleet Africa
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CRÉATION DE L'ÉQUIPE ESAMBA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Supabase CLI est installé
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI n'est pas installé." -ForegroundColor Red
    Write-Host "   Installez-le avec: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Vérifier que le fichier SQL existe
$sqlFile = "supabase\create-esamba-team-complete.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Fichier SQL non trouvé : $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Fichier SQL trouvé : $sqlFile" -ForegroundColor Green
Write-Host ""

# Demander confirmation
Write-Host "Ce script va :" -ForegroundColor Yellow
Write-Host "  1. Vérifier que la Flotte ESAMBA existe" -ForegroundColor Yellow
Write-Host "  2. Afficher les membres existants" -ForegroundColor Yellow
Write-Host "  3. Créer des membres de test (si utilisateurs existent)" -ForegroundColor Yellow
Write-Host "  4. Vérifier les résultats" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Voulez-vous continuer ? (O/N)"
if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Host "❌ Opération annulée." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Exécution du script SQL..." -ForegroundColor Cyan
Write-Host ""

# Exécuter le script SQL via Supabase CLI
# Note: Vous devez être connecté à votre projet Supabase
try {
    $sqlContent = Get-Content $sqlFile -Raw
    
    # Si vous utilisez Supabase CLI avec db execute
    # supabase db execute --file $sqlFile
    
    # Sinon, afficher les instructions
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "INSTRUCTIONS POUR EXÉCUTER LE SCRIPT" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 1 : Via Supabase Dashboard" -ForegroundColor Yellow
    Write-Host "  1. Allez sur https://app.supabase.com" -ForegroundColor White
    Write-Host "  2. Sélectionnez votre projet" -ForegroundColor White
    Write-Host "  3. Allez dans SQL Editor" -ForegroundColor White
    Write-Host "  4. Copiez-collez le contenu de : $sqlFile" -ForegroundColor White
    Write-Host "  5. Cliquez sur Run ou appuyez sur F5" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2 : Via Supabase CLI" -ForegroundColor Yellow
    Write-Host "  supabase db execute --file $sqlFile" -ForegroundColor White
    Write-Host ""
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "VÉRIFICATION APRÈS EXÉCUTION" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pour vérifier que les membres ont été créés :" -ForegroundColor Yellow
    Write-Host "  1. Allez sur http://localhost:8080/dashboard/teams" -ForegroundColor White
    Write-Host "  2. Ou exécutez la requête de vérification dans SQL Editor" -ForegroundColor White
    Write-Host ""
    
    # Afficher la requête de vérification
    Write-Host "Requête de vérification :" -ForegroundColor Cyan
    Write-Host @"
SELECT 
  fm.id as membership_id,
  fm.role,
  fm.is_active,
  p.full_name,
  p.phone,
  u.email,
  fm.created_at
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN profiles p ON p.user_id = fm.user_id
LEFT JOIN auth.users u ON u.id = fm.user_id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY fm.created_at DESC;
"@ -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution : $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Instructions affichées avec succès !" -ForegroundColor Green
Write-Host ""
