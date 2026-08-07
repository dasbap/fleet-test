$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

$EnvFile = Join-Path $PSScriptRoot "android-release.env.ps1"

if (Test-Path $EnvFile) {
    Write-Host "Chargement de la configuration : $EnvFile" -ForegroundColor DarkGray
    . $EnvFile
}

function Get-RequiredEnvironmentVariable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $Value = [Environment]::GetEnvironmentVariable(
        $Name,
        [EnvironmentVariableTarget]::Process
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Variable d'environnement manquante : $Name"
    }

    return $Value.Trim()
}
function Get-RequiredEnvironmentVariable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $Value = [Environment]::GetEnvironmentVariable($Name)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Variable d'environnement manquante : $Name"
    }

    return $Value.Trim()
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [Parameter()]
        [string[]]$Arguments = @()
    )

    Write-Host ""
    Write-Host "> $Command $($Arguments -join ' ')" -ForegroundColor Cyan

    & $Command @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "La commande a échoué avec le code $LASTEXITCODE : $Command"
    }
}

$R2Bucket = Get-RequiredEnvironmentVariable "R2_BUCKET"
$R2PublicUrl = Get-RequiredEnvironmentVariable "R2_PUBLIC_URL"

$R2ApkKey = if (
    [string]::IsNullOrWhiteSpace($env:R2_APK_KEY)
) {
    "e-samba-android.apk"
} else {
    $env:R2_APK_KEY.Trim().TrimStart("/")
}

$R2ReleasesPrefix = if (
    [string]::IsNullOrWhiteSpace($env:R2_RELEASES_PREFIX)
) {
    "releases"
} else {
    $env:R2_RELEASES_PREFIX.Trim().Trim("/")
}

$PackageJsonPath = Join-Path $RootDir "package.json"
$AndroidDir = Join-Path $RootDir "android"
$ReleaseDir = Join-Path $RootDir "releases\android"

$LatestApk = Join-Path `
    $ReleaseDir `
    "e-samba-android.apk"

$LatestJson = Join-Path `
    $ReleaseDir `
    "latest.json"

if (-not (Test-Path $PackageJsonPath)) {
    throw "package.json introuvable : $PackageJsonPath"
}

$PackageJson = Get-Content `
    $PackageJsonPath `
    -Raw |
    ConvertFrom-Json

$PackageVersion = [string]$PackageJson.version

if ([string]::IsNullOrWhiteSpace($PackageVersion)) {
    throw "La version est absente de package.json"
}

$BuildDate = (Get-Date).ToUniversalTime().ToString(
    "yyyyMMdd-HHmmss"
)

$VersionedFilename = `
    "e-samba-$PackageVersion-$BuildDate-debug.apk"

$VersionedApk = Join-Path `
    $ReleaseDir `
    $VersionedFilename

Write-Host ""
Write-Host "Publication Android E-Samba" -ForegroundColor Green
Write-Host "Mode     : debug"
Write-Host "Version  : $PackageVersion"
Write-Host "Bucket   : $R2Bucket"
Write-Host "APK R2   : $R2ApkKey"
Write-Host "Archives : $R2ReleasesPrefix"

if (-not (Test-Path $AndroidDir)) {
    Write-Host ""
    Write-Host "Projet Android absent, création avec Capacitor..." -ForegroundColor Yellow

    Invoke-CheckedCommand "npx" @(
        "cap",
        "add",
        "android"
    )
}

$SetAndroidVersionScript = Join-Path `
    $RootDir `
    "scripts\set-android-version.mjs"

if (Test-Path $SetAndroidVersionScript) {
    Invoke-CheckedCommand "node" @(
        "scripts/set-android-version.mjs"
    )
}

Invoke-CheckedCommand "npm" @(
    "run",
    "build",
    "--",
    "--mode",
    "prod"
)

Invoke-CheckedCommand "npx" @(
    "cap",
    "sync",
    "android"
)

$GradleWrapper = Join-Path `
    $AndroidDir `
    "gradlew.bat"

if (-not (Test-Path $GradleWrapper)) {
    throw "Gradle Wrapper introuvable : $GradleWrapper"
}

Push-Location $AndroidDir

try {
    Invoke-CheckedCommand $GradleWrapper @(
        "clean",
        "assembleDebug"
    )
}
finally {
    Pop-Location
}

$ExpectedApk = Join-Path `
    $AndroidDir `
    "app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $ExpectedApk)) {
    throw "APK debug introuvable : $ExpectedApk"
}

New-Item `
    -ItemType Directory `
    -Path $ReleaseDir `
    -Force |
    Out-Null

Copy-Item `
    -Path $ExpectedApk `
    -Destination $LatestApk `
    -Force

Copy-Item `
    -Path $ExpectedApk `
    -Destination $VersionedApk `
    -Force

$ApkFile = Get-Item $LatestApk

$ApkHash = Get-FileHash `
    -Path $LatestApk `
    -Algorithm SHA256

$NormalizedPublicUrl = $R2PublicUrl.TrimEnd("/")
$DownloadUrl = "$NormalizedPublicUrl/$R2ApkKey"

$LatestMetadata = [ordered]@{
    version       = $PackageVersion
    build_type    = "debug"
    build_date    = $BuildDate
    filename      = $VersionedFilename
    size          = $ApkFile.Length
    sha256        = $ApkHash.Hash.ToLowerInvariant()
    download_url  = $DownloadUrl
}

$LatestMetadata |
    ConvertTo-Json |
    Set-Content `
        -Path $LatestJson `
        -Encoding utf8

Invoke-CheckedCommand "npx" @(
    "wrangler",
    "r2",
    "object",
    "put",
    "$R2Bucket/$R2ApkKey",
    "--file",
    $LatestApk,
    "--content-type",
    "application/vnd.android.package-archive",
    "--content-disposition",
    'attachment; filename="e-samba-android.apk"',
    "--cache-control",
    "public, max-age=300",
    "--remote"
)

Invoke-CheckedCommand "npx" @(
    "wrangler",
    "r2",
    "object",
    "put",
    "$R2Bucket/$R2ReleasesPrefix/$VersionedFilename",
    "--file",
    $VersionedApk,
    "--content-type",
    "application/vnd.android.package-archive",
    "--content-disposition",
    "attachment; filename=`"$VersionedFilename`"",
    "--cache-control",
    "public, max-age=31536000, immutable",
    "--remote"
)

Invoke-CheckedCommand "npx" @(
    "wrangler",
    "r2",
    "object",
    "put",
    "$R2Bucket/latest.json",
    "--file",
    $LatestJson,
    "--content-type",
    "application/json; charset=utf-8",
    "--cache-control",
    "public, max-age=300",
    "--remote"
)

Write-Host ""
Write-Host "Publication terminée." -ForegroundColor Green
Write-Host ""
Write-Host "APK source      : $ExpectedApk"
Write-Host "APK local       : $LatestApk"
Write-Host "Archive locale  : $VersionedApk"
Write-Host "SHA-256         : $($LatestMetadata.sha256)"
Write-Host "Téléchargement  : $DownloadUrl"
Write-Host "Métadonnées     : $NormalizedPublicUrl/latest.json"
Write-Host ""
Write-Host "Attention : cet APK est un build debug." -ForegroundColor Yellow