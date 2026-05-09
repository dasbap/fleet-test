# Déverrouiller .vscode pour que Git puisse y accéder
# À exécuter après avoir FERMÉ Cursor (et tout autre éditeur utilisant ce dossier).
# Clic droit sur PowerShell -> "Exécuter en tant qu'administrateur" si accès refusé.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$vscodePath = Join-Path $root ".vscode"

if (-not (Test-Path $vscodePath)) {
    Write-Host "Le dossier .vscode n'existe pas : $vscodePath" -ForegroundColor Yellow
    exit 0
}

Write-Host "Réinitialisation des permissions sur : $vscodePath" -ForegroundColor Cyan
try {
    icacls $vscodePath /reset /T /Q
    Write-Host "Permissions réinitialisées." -ForegroundColor Green
} catch {
    Write-Host "Erreur (essayez en exécutant PowerShell en tant qu'administrateur) : $_" -ForegroundColor Red
    exit 1
}

Write-Host "Vous pouvez rouvrir Cursor et relancer : git cherry-pick 2a0070b" -ForegroundColor Green
