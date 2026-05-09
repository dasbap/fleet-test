# Script de verification de la configuration Supabase

Write-Host "Verification de la configuration Supabase..." -ForegroundColor Cyan
Write-Host ""

# Verifier que .env.local existe
if (Test-Path ".env.local") {
    Write-Host "OK: Fichier .env.local existe" -ForegroundColor Green
    
    # Lire les variables
    $envContent = Get-Content ".env.local" -Raw
    $hasUrl = $envContent -match "VITE_SUPABASE_URL\s*="
    $hasKey = $envContent -match "VITE_SUPABASE_ANON_KEY\s*="
    
    if ($hasUrl) {
        $urlMatch = [regex]::Match($envContent, "VITE_SUPABASE_URL\s*=\s*(.+)")
        $url = $urlMatch.Groups[1].Value.Trim()
        if ($url -and $url -notmatch "votre-projet|example") {
            Write-Host "OK: VITE_SUPABASE_URL configure: $url" -ForegroundColor Green
        } else {
            Write-Host "ATTENTION: VITE_SUPABASE_URL n'est pas configure correctement" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERREUR: VITE_SUPABASE_URL manquant dans .env.local" -ForegroundColor Red
    }
    
    if ($hasKey) {
        $keyMatch = [regex]::Match($envContent, "VITE_SUPABASE_ANON_KEY\s*=\s*(.+)")
        $key = $keyMatch.Groups[1].Value.Trim()
        if ($key -and $key.Length -gt 50 -and $key -notmatch "votre_cle|example") {
            Write-Host "OK: VITE_SUPABASE_ANON_KEY configure (longueur: $($key.Length))" -ForegroundColor Green
        } else {
            Write-Host "ATTENTION: VITE_SUPABASE_ANON_KEY n'est pas configure correctement" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERREUR: VITE_SUPABASE_ANON_KEY manquant dans .env.local" -ForegroundColor Red
    }
} else {
    Write-Host "ERREUR: Fichier .env.local introuvable" -ForegroundColor Red
    Write-Host "Executez: npm run init:env" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Verification du client Supabase..." -ForegroundColor Cyan

# Verifier que le fichier client.ts existe et utilise les variables d'environnement
if (Test-Path "src/integrations/supabase/client.ts") {
    $clientContent = Get-Content "src/integrations/supabase/client.ts" -Raw
    if ($clientContent -match "import\.meta\.env\.VITE_SUPABASE_URL") {
        Write-Host "OK: client.ts utilise les variables d'environnement" -ForegroundColor Green
    } else {
        Write-Host "ATTENTION: client.ts pourrait ne pas utiliser les variables d'environnement" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERREUR: Fichier client.ts introuvable" -ForegroundColor Red
}

Write-Host ""
Write-Host "Verification terminee!" -ForegroundColor Cyan
Write-Host ""
