# Script de test pour la page Invitations
# Vérifie que tout est configuré correctement

Write-Host "Test de la configuration Invitations..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que le serveur tourne
Write-Host "1. Vérification du serveur..." -ForegroundColor Yellow
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   OK: Serveur accessible sur http://localhost:8080" -ForegroundColor Green
        $serverRunning = $true
    }
} catch {
    Write-Host "   ERREUR: Serveur non accessible sur http://localhost:8080" -ForegroundColor Red
    Write-Host "   Démarrez le serveur avec: npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. Vérification des fichiers..." -ForegroundColor Yellow

$files = @(
    "src/pages/Invitations.tsx",
    "src/components/invitations/CreateInvitationDialog.tsx",
    "src/hooks/useInvitations.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   OK: $file" -ForegroundColor Green
    } else {
        Write-Host "   ERREUR: $file introuvable" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "3. Vérification de la route..." -ForegroundColor Yellow

$appContent = Get-Content "src/App.tsx" -Raw
if ($appContent -match "Invitations") {
    Write-Host "   OK: Route /dashboard/invitations configurée" -ForegroundColor Green
} else {
    Write-Host "   ERREUR: Route non trouvée dans App.tsx" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Instructions pour tester..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Pour utiliser la page Invitations:" -ForegroundColor Cyan
Write-Host "   1. Connectez-vous en tant qu'organizer ou manager" -ForegroundColor White
Write-Host "   2. Allez sur: http://localhost:8080/dashboard/invitations" -ForegroundColor White
Write-Host "   3. Cliquez sur 'Créer une invitation'" -ForegroundColor White
Write-Host "   4. Remplissez le formulaire et créez l'invitation" -ForegroundColor White
Write-Host ""
Write-Host "   Vérifications dans Supabase:" -ForegroundColor Cyan
Write-Host "   1. Allez dans Supabase Dashboard -> Table Editor -> fleet_invitations" -ForegroundColor White
Write-Host "   2. Vérifiez que les invitations créées apparaissent" -ForegroundColor White
Write-Host "   3. Vérifiez les politiques RLS dans Authentication -> Policies" -ForegroundColor White
Write-Host ""
Write-Host "   Consultez HOW-TO-USE-INVITATIONS-PAGE.md pour plus de détails" -ForegroundColor Cyan
Write-Host ""
