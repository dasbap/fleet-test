#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Définit CAPACITOR_ANDROID_STUDIO_PATH (profil utilisateur Windows) pour la CLI Capacitor.

.DESCRIPTION
  Cherche studio64.exe dans les emplacements d’installation courants, sinon utilise
  le chemin par défaut « Program Files ». Nécessaire pour `npm run cap:open:android`.

.PARAMETER StudioPath
  Chemin absolu vers studio64.exe (prioritaire).

.PARAMETER AllowMissing
  Sans -StudioPath : si studio64.exe est introuvable, définit quand même le chemin standard.
  Avec -StudioPath : ignoré (le chemin explicite est toujours enregistré).
#>
param(
  [string]$StudioPath,
  [switch]$AllowMissing
)

$ErrorActionPreference = "Stop"

$candidates = @(
  "${env:ProgramFiles}\Android\Android Studio\bin\studio64.exe",
  "${env:ProgramFiles(x86)}\Android\Android Studio\bin\studio64.exe",
  "${env:LocalAppData}\Programs\Android Studio\bin\studio64.exe"
)

$resolved = $null
if ($StudioPath) {
  $resolved = [System.IO.Path]::GetFullPath($StudioPath)
  if (-not (Test-Path -LiteralPath $resolved)) {
    Write-Warning "Fichier absent pour l'instant : $resolved (chemin enregistré tel quel)."
  }
} else {
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) {
      $resolved = $c
      break
    }
  }
  if (-not $resolved) {
    $resolved = $candidates[0]
  }
}

if (-not $StudioPath -and -not (Test-Path -LiteralPath $resolved)) {
  if (-not $AllowMissing) {
    Write-Error @"
studio64.exe introuvable : $resolved
Installez Android Studio, ou relancez avec :
  -StudioPath 'C:\chemin\vers\bin\studio64.exe'
ou pour fixer le chemin standard avant installation :
  -AllowMissing
"@
    exit 1
  }
  Write-Warning "Fichier absent pour l'instant : $resolved (variable définie pour une installation standard)."
}

[Environment]::SetEnvironmentVariable("CAPACITOR_ANDROID_STUDIO_PATH", $resolved, "User")
$env:CAPACITOR_ANDROID_STUDIO_PATH = $resolved

Write-Host "[OK] CAPACITOR_ANDROID_STUDIO_PATH = $resolved"
Write-Host "     (variable utilisateur Windows ; rouvrez le terminal pour propager partout.)"
