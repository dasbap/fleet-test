# Verifier la configuration et le lien Supabase (env + CLI)
# Usage: depuis la racine du projet

$ErrorActionPreference = "Continue"
$projectRoot = if (Test-Path "package.json") { Get-Location } else { Join-Path $PSScriptRoot ".." }
Set-Location $projectRoot

Write-Host "=== Verification lien Supabase ===" -ForegroundColor Cyan
Write-Host ""

# 1. Fichier .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "[.env.local] Manquant. Copiez .env.example vers .env.local et configurez." -ForegroundColor Red
} else {
    $envContent = Get-Content ".env.local" -Raw
    $urlMatch = [regex]::Match($envContent, "VITE_SUPABASE_URL\s*=\s*(.+)")
    $url = if ($urlMatch.Success) { $urlMatch.Groups[1].Value.Trim() } else { $null }
    if (-not $url -or $url -match "votre-projet|example") {
        Write-Host "[.env.local] VITE_SUPABASE_URL non configure ou encore placeholder." -ForegroundColor Yellow
    } else {
        $refMatch = [regex]::Match($url, "https://([a-z0-9]+)\.supabase\.co")
        $projectRef = if ($refMatch.Success) { $refMatch.Groups[1].Value } else { "?" }
        Write-Host "[.env.local] OK - URL configuree, project_ref extrait: $projectRef" -ForegroundColor Green
    }
}
Write-Host ""

# 2. CLI Supabase (lien remote)
Write-Host "[CLI] Verification du lien remote (npx supabase)..." -ForegroundColor Cyan
$linkOut = npx supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[CLI] Connexion Supabase requise. Lancez: npx supabase login" -ForegroundColor Yellow
    Write-Host "     Puis liez ce repo: npx supabase link --project-ref <VOTRE_PROJECT_REF>" -ForegroundColor Yellow
    Write-Host "     (project_ref = partie avant .supabase.co dans l'URL du projet)" -ForegroundColor Gray
} else {
    Write-Host "[CLI] Projets accessibles. Pour lier ce dossier au projet remote:" -ForegroundColor Green
    Write-Host "     npx supabase link --project-ref <VOTRE_PROJECT_REF>" -ForegroundColor White
}
Write-Host ""

# 3. Rappel config
Write-Host "=== Rappel ===" -ForegroundColor Cyan
Write-Host "  - App (Vite): utilise .env.local (VITE_SUPABASE_*)" -ForegroundColor Gray
Write-Host "  - CLI (migrations, db push): utilise 'supabase link' + SUPABASE_ACCESS_TOKEN" -ForegroundColor Gray
Write-Host ""
