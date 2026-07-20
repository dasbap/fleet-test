# Script de nettoyage automatique du cache Cursor
Write-Host "=== Nettoyage du cache Cursor ===" -ForegroundColor Cyan

$cachePath = Join-Path $env:APPDATA "Cursor\Cache"

Write-Host ""
Write-Host "1. Verification des processus Cursor..." -ForegroundColor Yellow
$cursorProcesses = Get-Process | Where-Object { $_.ProcessName -match "cursor|Cursor" } -ErrorAction SilentlyContinue

if ($cursorProcesses) {
    Write-Host "   ATTENTION: Cursor est encore en cours d'execution!" -ForegroundColor Red
    Write-Host "   Processus trouves:" -ForegroundColor Yellow
    $cursorProcesses | ForEach-Object {
        Write-Host "   - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "   Veuillez fermer Cursor avant de continuer." -ForegroundColor Yellow
    Write-Host "   Appuyez sur une touche apres avoir ferme Cursor..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    # Verifier a nouveau
    $cursorProcesses = Get-Process | Where-Object { $_.ProcessName -match "cursor|Cursor" } -ErrorAction SilentlyContinue
    if ($cursorProcesses) {
        Write-Host "   ERREUR: Cursor est toujours en cours d'execution" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "2. Nettoyage du cache..." -ForegroundColor Yellow
if (Test-Path $cachePath) {
    $cacheSize = (Get-ChildItem $cachePath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   Cache trouve: $cachePath" -ForegroundColor Green
    Write-Host "   Taille: $([math]::Round($cacheSize, 2)) MB" -ForegroundColor White
    
    Write-Host "   Suppression en cours..." -ForegroundColor Yellow
    Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 1
    
    if (-not (Test-Path $cachePath)) {
        Write-Host "   OK: Cache supprime avec succes!" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Vous pouvez maintenant redemarrer Cursor." -ForegroundColor Cyan
    } else {
        Write-Host "   ERREUR: Impossible de supprimer le cache completement" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   Cache non trouve a: $cachePath" -ForegroundColor Yellow
    Write-Host "   Rien a nettoyer." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Termine ===" -ForegroundColor Cyan
