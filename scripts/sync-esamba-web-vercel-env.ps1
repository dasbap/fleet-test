# Persiste les variables apps/esamba-web sur Vercel.
# Preview (Git) : configurer aussi dans le Dashboard (toutes branches) si le CLI refuse preview.
# Usage : powershell -ExecutionPolicy Bypass -File scripts/sync-esamba-web-vercel-env.ps1
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$appDir = Join-Path $root "apps\esamba-web"
$envPath = Join-Path $appDir ".env.local"

if (-not (Test-Path $envPath)) {
  Write-Error "Fichier introuvable : $envPath"
}

function Read-DotEnv([string]$Path) {
  $map = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
    $map[$key] = $val
  }
  return $map
}

function Add-VercelEnv([string]$Key, [string]$Value, [string]$Target) {
  Write-Host ">> $Key [$Target]"
  Push-Location $appDir
  & npx vercel env add $Key $Target --value $Value --yes --force --no-sensitive
  if ($LASTEXITCODE -ne 0) { throw "vercel env add $Key $Target a echoue" }
  Pop-Location
}

$vars = Read-DotEnv $envPath
Write-Host ">> Sync variables Vercel - atipik/esamba-web (Production + Development)"

$required = @("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
foreach ($key in $required) {
  if (-not $vars[$key]) { throw "Variable requise manquante : $key" }
  foreach ($target in @("production", "development")) {
    Add-VercelEnv $key $vars[$key] $target
  }
}

$optionalKeys = @(
  "NOTCH_PAY_API_KEY",
  "NOTCHPAY_SECRET_KEY",
  "FAPSHI_API_USER",
  "FAPSHI_API_KEY",
  "FAPSHI_API_URL"
)
foreach ($optKey in $optionalKeys) {
  $optVal = $vars[$optKey]
  if ($optVal) {
    foreach ($target in @("production", "development")) {
      Add-VercelEnv $optKey $optVal $target
    }
  }
}

Add-VercelEnv "NEXT_PUBLIC_APP_URL" "https://www.e-samba.com" "production"

Write-Host ""
Write-Host ">> OK - Production + Development synchronises"
Write-Host ">> Actions manuelles Dashboard Vercel (esamba-web) :"
Write-Host "   1. Settings > General > Root Directory = apps/esamba-web"
Write-Host "   2. Settings > Environment Variables > dupliquer vers Preview (toutes branches)"
Write-Host "   3. Settings > Deployment Protection : desactiver SSO/password sur Preview si 401"
