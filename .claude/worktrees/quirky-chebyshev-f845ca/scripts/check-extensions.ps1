# Script pour verifier les extensions Cursor/VS Code installees
# Compare avec les extensions recommandees dans .vscode/extensions.json

Write-Host "Verification des extensions Cursor..." -ForegroundColor Cyan
Write-Host ""

# Lire les extensions recommandees
if (Test-Path ".vscode/extensions.json") {
    $extensionsJson = Get-Content ".vscode/extensions.json" -Raw | ConvertFrom-Json
    $recommended = $extensionsJson.recommendations

    Write-Host "Extensions recommandees:" -ForegroundColor Yellow
    foreach ($ext in $recommended) {
        Write-Host "   - $ext" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "Pour installer toutes les extensions recommandees:" -ForegroundColor Cyan
    Write-Host "   1. Ouvrez Cursor" -ForegroundColor White
    Write-Host "   2. Une notification devrait apparaitre pour installer les extensions" -ForegroundColor White
    Write-Host "   3. Ou utilisez: Ctrl+Shift+X puis recherchez chaque extension" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "ERREUR: Fichier .vscode/extensions.json introuvable" -ForegroundColor Red
}
