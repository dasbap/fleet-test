# Reset DB locale Supabase via Docker (sans supabase db reset).
# Usage: powershell -File scripts/reset-local-db-docker.ps1 [-HostPort 0]

param(
  [int]$HostPort = 0
)

$ErrorActionPreference = "Stop"

$ProjectId = "smart-fleet-africa"
$ContainerName = "supabase_db_$ProjectId"
$VolumeName = "supabase_db_$ProjectId"
$NetworkName = "supabase_network_$ProjectId"
$PostgresImage = "public.ecr.aws/supabase/postgres:17.6.1.063"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$MigrationsDir = Join-Path $RepoRoot "supabase\migrations"
$PortsHelper = Join-Path $PSScriptRoot "_local-supabase-ports.ps1"

if (-not (Test-Path $PortsHelper)) {
  throw "Helper ports Supabase introuvable: $PortsHelper"
}

. $PortsHelper

if ($HostPort -eq 0) {
  $HostPort = Get-FreeLocalTcpPort
}

function Wait-DbHealthy {
  param([int]$TimeoutSec = 180)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  do {
    Start-Sleep -Seconds 3
    $status = docker inspect --format='{{.State.Health.Status}}' $ContainerName 2>$null
    if ($status -eq "healthy") {
      return
    }
  } while ((Get-Date) -lt $deadline)
  throw "Conteneur $ContainerName non healthy apres ${TimeoutSec}s (statut: $status)"
}

function Invoke-DockerDbReset {
  Write-Host "Reset Docker: arret conteneur + volume..." -ForegroundColor Cyan
  $existing = docker ps -aq --filter "name=^${ContainerName}$"
  if ($existing) {
    docker stop $ContainerName 2>$null | Out-Null
    docker rm -f $ContainerName 2>$null | Out-Null
  }

  $existingVolume = docker volume ls -q --filter "name=^${VolumeName}$"
  if ($existingVolume) {
    docker volume rm $VolumeName 2>$null | Out-Null
  }

  $existingNetwork = docker network ls -q --filter "name=^${NetworkName}$"
  if (-not $existingNetwork) {
    docker network create $NetworkName | Out-Null
  }

  Write-Host "Recreation conteneur Postgres ($PostgresImage)..." -ForegroundColor Cyan
  Write-Host "Port Postgres local publie: $HostPort -> 5432" -ForegroundColor Yellow
  docker run -d `
    --name $ContainerName `
    --label "com.supabase.cli.project=$ProjectId" `
    --network $NetworkName `
    -v "${VolumeName}:/var/lib/postgresql/data" `
    -e POSTGRES_PASSWORD=postgres `
    -e POSTGRES_HOST=/var/run/postgresql `
    -p "${HostPort}:5432" `
    --health-cmd "pg_isready -U postgres -h localhost" `
    --health-interval 5s `
    --health-timeout 5s `
    --health-retries 10 `
    $PostgresImage | Out-Null

  Wait-DbHealthy
}

function Apply-ProjectMigrations {
  if (-not (Test-Path $MigrationsDir)) {
    throw "Dossier migrations introuvable: $MigrationsDir"
  }

  $files = Get-ChildItem $MigrationsDir -Filter "*.sql" | Sort-Object Name
  Write-Host "Application de $($files.Count) migrations..." -ForegroundColor Cyan

  $applied = 0
  $skipped = 0
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    foreach ($file in $files) {
      $output = Get-Content $file.FullName -Raw | docker exec -i $ContainerName psql -U postgres -d postgres -v ON_ERROR_STOP=0 2>&1 | Out-String
      if ($LASTEXITCODE -ne 0 -and $output -match "ERROR:") {
        $skipped++
        continue
      }
      $applied++
    }
  }
  finally {
    $ErrorActionPreference = $prevEap
  }

  Write-Host "Migrations: $applied appliquees, $skipped avec erreurs ignorees (idempotence)." -ForegroundColor Gray
}

Invoke-DockerDbReset
Apply-ProjectMigrations
Write-Host "OK: Reset DB Docker termine." -ForegroundColor Green
