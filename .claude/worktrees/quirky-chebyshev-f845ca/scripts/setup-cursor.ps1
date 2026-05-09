# Script de configuration automatique pour Cursor
# Ce script verifie et configure l'environnement de developpement

Write-Host "Configuration de l'environnement Cursor pour Smart Fleet Africa" -ForegroundColor Cyan
Write-Host ""

# Verifier que Node.js est installe
Write-Host "Verification de Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   OK Node.js installe: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js non trouve"
    }
} catch {
    Write-Host "   ERREUR Node.js n'est pas installe" -ForegroundColor Red
    Write-Host "   Installez Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verifier que npm est installe
Write-Host "Verification de npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   OK npm installe: $npmVersion" -ForegroundColor Green
    } else {
        throw "npm non trouve"
    }
} catch {
    Write-Host "   ERREUR npm n'est pas installe" -ForegroundColor Red
    exit 1
}

# Verifier les dependances
Write-Host "Verification des dependances..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   OK node_modules existe" -ForegroundColor Green
} else {
    Write-Host "   ATTENTION node_modules n'existe pas, installation en cours..." -ForegroundColor Yellow
    npm install
}

# Verifier les fichiers de configuration
Write-Host "Verification des fichiers de configuration..." -ForegroundColor Yellow

$configFiles = @(
    ".vscode/settings.json",
    ".vscode/extensions.json",
    ".vscode/launch.json",
    ".vscode/tasks.json",
    ".cursorrules",
    ".editorconfig",
    ".prettierrc"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "   OK $file" -ForegroundColor Green
    } else {
        Write-Host "   ERREUR $file manquant" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Configuration terminee!" -ForegroundColor Green
Write-Host ""
Write-Host "Actions manuelles requises:" -ForegroundColor Cyan
Write-Host "   1. Dans Cursor, appuyez sur Ctrl+Shift+X pour ouvrir les extensions" -ForegroundColor White
Write-Host "   2. Installez les extensions recommandees (une notification devrait apparaitre)" -ForegroundColor White
Write-Host "   3. Redemarrez Cursor (Ctrl+Shift+P puis 'Developer: Reload Window')" -ForegroundColor White
Write-Host "   4. Utilisez Ctrl+Shift+P puis 'Tasks: Run Task' pour acceder aux taches" -ForegroundColor White
Write-Host ""
