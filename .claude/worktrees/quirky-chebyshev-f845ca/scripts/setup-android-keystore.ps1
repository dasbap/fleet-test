#Requires -Version 5.1
<#
.SYNOPSIS
  Génère android/upload-keystore.jks, android/keystore.properties et un fichier d’aide local
  pour renseigner les secrets GitHub (ne pas commiter).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/setup-android-keystore.ps1
  powershell -ExecutionPolicy Bypass -File scripts/setup-android-keystore.ps1 -Force
#>
param(
  [switch] $Force
)

$ErrorActionPreference = "Stop"

function Find-KeytoolPath {
  $cmd = Get-Command keytool -ErrorAction SilentlyContinue
  if ($cmd -and (Test-Path $cmd.Source)) { return $cmd.Source }

  $javaCmd = Get-Command java -ErrorAction SilentlyContinue
  if ($javaCmd) {
    $bin = Split-Path $javaCmd.Source -Parent
    $kt = Join-Path $bin "keytool.exe"
    if (Test-Path $kt) { return $kt }
  }

  $candidates = @(
    "$env:JAVA_HOME\bin\keytool.exe"
    "${env:ProgramFiles}\Android\Android Studio\jbr\bin\keytool.exe"
    "${env:ProgramFiles(x86)}\Android\android-studio\jbr\bin\keytool.exe"
  ) | Where-Object { $_ -and (Test-Path $_) }

  if ($candidates.Count -gt 0) { return $candidates[0] }

  $adoptium = Get-ChildItem "${env:ProgramFiles}\Eclipse Adoptium" -ErrorAction SilentlyContinue |
    Where-Object { $_.PSIsContainer } |
    ForEach-Object {
      $p = Join-Path $_.FullName "bin\keytool.exe"
      if (Test-Path $p) { $p }
    } |
    Select-Object -First 1
  if ($adoptium) { return $adoptium }

  return $null
}

function Test-DockerEngine {
  $null = docker info 2>&1
  return $LASTEXITCODE -eq 0
}

function Invoke-GenerateWithDocker {
  param(
    [string] $JksPath,
    [string] $StorePass,
    [string] $KeyPass,
    [string] $Alias
  )
  if (-not (Test-DockerEngine)) {
    return $false
  }
  $mount = Split-Path $JksPath -Parent
  $fileName = Split-Path $JksPath -Leaf
  $dname = "CN=Flotte E-Samba, OU=Mobile, O=E-Samba, L=Unknown, ST=Unknown, C=FR"
  docker run --rm `
    -v "${mount}:/out" `
    eclipse-temurin:17-jdk-jammy `
    keytool -genkeypair -v `
    -keystore "/out/$fileName" `
    -alias $Alias `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $StorePass `
    -keypass $KeyPass `
    -dname $dname `
    -noprompt
  return $true
}

$repoRoot = Split-Path $PSScriptRoot -Parent
$androidDir = Join-Path $repoRoot "android"
$jksPath = Join-Path $androidDir "upload-keystore.jks"
$propsPath = Join-Path $androidDir "keystore.properties"
$hintsPath = Join-Path $androidDir ".github-android-secrets.local.txt"

if ((Test-Path $jksPath) -and -not $Force) {
  Write-Host "Le fichier existe deja : $jksPath`nUtilisez -Force pour regenerer (l'ancien sera ecrase)." -ForegroundColor Yellow
  exit 2
}

$chars = [char[]]((48..57) + (65..90) + (97..122))
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$storePass = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
$keyPass = $storePass
$alias = "upload"

if (Test-Path $jksPath) {
  Remove-Item -Force $jksPath
}

$keytool = Find-KeytoolPath
$dname = 'CN=Flotte E-Samba, OU=Mobile, O=E-Samba, L=Unknown, ST=Unknown, C=FR'

if ($keytool) {
  Write-Host "Utilisation de keytool : $keytool"
  & $keytool @(
    "-genkeypair", "-v",
    "-keystore", $jksPath,
    "-alias", $alias,
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", "10000",
    "-storepass", $storePass,
    "-keypass", $keyPass,
    "-dname", $dname,
    "-noprompt"
  )
} else {
  Write-Host "keytool local introuvable - tentative via Docker (eclipse-temurin:17-jdk-jammy)..." -ForegroundColor Yellow
  $ok = Invoke-GenerateWithDocker -JksPath $jksPath -StorePass $storePass -KeyPass $keyPass -Alias $alias
  if (-not $ok -or -not (Test-Path $jksPath)) {
    Write-Host ""
    Write-Host "Impossible de générer le keystore automatiquement." -ForegroundColor Red
    Write-Host "Options :" -ForegroundColor Yellow
    Write-Host "  1) Installer un JDK 17+ (ex. winget install EclipseAdoptium.Temurin.17.JDK) puis relancer ce script."
    Write-Host "  2) Démarrer Docker Desktop et relancer ce script (image eclipse-temurin téléchargée au premier usage)."
    Write-Host "  3) Créer le keystore manuellement : voir docs/publication-stores.md"
    exit 1
  }
}

$propsContent = @"
storePassword=$storePass
keyPassword=$keyPass
keyAlias=$alias
storeFile=../upload-keystore.jks
"@
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($propsPath, $propsContent.TrimEnd(), $utf8NoBom)

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($jksPath))

$hintsLines = @(
  "# Fichier local genere par scripts/setup-android-keystore.ps1 - NE PAS COMMITER (dans .gitignore)."
  "# Supprimez ce fichier apres configuration GitHub."
  ""
  "ANDROID_KEYSTORE_BASE64="
  $b64
  ""
  "ANDROID_STORE_PASSWORD=$storePass"
  "ANDROID_KEY_PASSWORD=$keyPass"
  "ANDROID_KEY_ALIAS=$alias"
  ""
  "# Commandes GitHub CLI (gh auth login requis) :"
  "# gh secret set ANDROID_KEYSTORE_BASE64 --body <coller la ligne base64 ci-dessus>"
  "# gh secret set ANDROID_STORE_PASSWORD --body <mot de passe>"
  "# npm run secrets:github-android"
)
[IO.File]::WriteAllText($hintsPath, ($hintsLines -join [Environment]::NewLine), $utf8NoBom)

Write-Host ""
Write-Host "OK - keystore : $jksPath" -ForegroundColor Green
Write-Host "OK - $propsPath" -ForegroundColor Green
Write-Host "Aide secrets (local) : $hintsPath" -ForegroundColor Cyan
Write-Host "Prochaine etape : npm run secrets:github-android"
