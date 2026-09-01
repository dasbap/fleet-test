# Synchronise .env.local vers les variables Production Vercel puis deploie.
# Les valeurs existantes portant les memes noms sont remplacees (--force).
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-vercel-prod-from-local-env.ps1

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $root ".env.local"
$vercelProjectPath = Join-Path $root ".vercel\project.json"
$vercelVersion = "58.4.0"

if (-not (Test-Path $envPath)) {
  throw "Fichier introuvable : $envPath"
}

if (-not (Test-Path $vercelProjectPath)) {
  throw "Projet Vercel non lie. Execute d'abord 'npx vercel link' depuis $root."
}

function Read-DotEnv([string]$Path) {
  $map = [ordered]@{}

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }

    if ($line.StartsWith("export ")) {
      $line = $line.Substring(7).Trim()
    }

    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }

    $key = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()

    if ($value.Length -ge 2) {
      $first = $value[0]
      $last = $value[$value.Length - 1]
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    if ($key -match '^[A-Za-z_][A-Za-z0-9_]*$') {
      $map[$key] = $value
    }
  }

  return $map
}

function Is-SensitiveKey([string]$Key) {
  return $Key -match '(?i)(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|SERVICE_ROLE|DATABASE_URL|DIRECT_URL|API_KEY|ANON_KEY)'
}

function Set-VercelProductionEnv([string]$Key, [string]$Value) {
  Write-Host ">> Sync $Key [production]"

  $args = @(
    "--yes", "vercel@$vercelVersion",
    "env", "add", $Key, "production",
    "--force", "--yes"
  )

  if (Is-SensitiveKey $Key) {
    $args += "--sensitive"
  }

  # La valeur passe par stdin afin de ne pas exposer les secrets dans la ligne de commande.
  $Value | & npx @args | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Echec de synchronisation Vercel pour $Key"
  }
}

Push-Location $root
try {
  $vars = Read-DotEnv $envPath
  if ($vars.Count -eq 0) {
    throw "Aucune variable valide trouvee dans $envPath"
  }

  Write-Host ">> Projet Vercel lie : $vercelProjectPath"
  Write-Host ">> Synchronisation de $($vars.Count) variable(s) depuis .env.local vers Production"

  foreach ($entry in $vars.GetEnumerator()) {
    $key = [string]$entry.Key
    $value = [string]$entry.Value

    # Les variables VERCEL_* sont reservees au contexte Vercel/CLI et ne doivent pas etre persistees comme env applicatives.
    if ($key.StartsWith("VERCEL_", [System.StringComparison]::OrdinalIgnoreCase)) {
      Write-Host ">> Skip $key (reserve Vercel)"
      continue
    }

    Set-VercelProductionEnv $key $value
  }

  Write-Host ">> Rafraichissement des variables Production locales Vercel"
  & npx --yes "vercel@$vercelVersion" pull --yes --environment=production
  if ($LASTEXITCODE -ne 0) { throw "vercel pull production a echoue" }

  Write-Host ">> Build Vercel Production avec les variables fraichement synchronisees"
  & npx --yes "vercel@$vercelVersion" build --prod
  if ($LASTEXITCODE -ne 0) { throw "vercel build --prod a echoue" }

  Write-Host ">> Deploiement Production"
  & npx --yes "vercel@$vercelVersion" deploy --prebuilt --prod --yes --archive=tgz
  if ($LASTEXITCODE -ne 0) { throw "vercel deploy --prod a echoue" }

  Write-Host ""
  Write-Host ">> OK - .env.local synchronise et production redeployee"
}
finally {
  Pop-Location
}
