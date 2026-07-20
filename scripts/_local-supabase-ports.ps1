$ErrorActionPreference = "Stop"

function Test-LocalTcpPortAvailable {
  param([int]$Port)

  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
    $listener.Start()
    return $true
  }
  catch {
    return $false
  }
  finally {
    if ($null -ne $listener) {
      $listener.Stop()
    }
  }
}

function Get-FreeLocalTcpPort {
  param([int[]]$Exclude = @())

  for ($attempt = 0; $attempt -lt 200; $attempt++) {
    $listener = $null
    try {
      $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, 0)
      $listener.Start()
      $port = [int]$listener.LocalEndpoint.Port
    }
    finally {
      if ($null -ne $listener) {
        $listener.Stop()
      }
    }

    if ($Exclude -notcontains $port -and (Test-LocalTcpPortAvailable -Port $port)) {
      return $port
    }
  }

  throw "Aucun port TCP libre trouve pour Supabase local."
}

function Set-TomlIntegerValueInSection {
  param(
    [string]$Content,
    [string]$SectionName,
    [string]$Key,
    [int]$Value
  )

  $escapedSection = [regex]::Escape($SectionName)
  $escapedKey = [regex]::Escape($Key)
  $pattern = "(?ms)(\[$escapedSection\]\s*(?:(?!\r?\n\[).)*?\r?\n\s*$escapedKey\s*=\s*)\d+"
  $updated = [regex]::Replace($Content, $pattern, "`${1}$Value", 1)

  if ($updated -eq $Content) {
    throw "Cle TOML introuvable: [$SectionName] $Key"
  }

  return $updated
}

function Set-TomlBooleanValueInSection {
  param(
    [string]$Content,
    [string]$SectionName,
    [string]$Key,
    [bool]$Value
  )

  $escapedSection = [regex]::Escape($SectionName)
  $escapedKey = [regex]::Escape($Key)
  $tomlValue = if ($Value) { "true" } else { "false" }
  $pattern = "(?ms)(\[$escapedSection\]\s*(?:(?!\r?\n\[).)*?\r?\n\s*$escapedKey\s*=\s*)(true|false)"
  $updated = [regex]::Replace($Content, $pattern, "`${1}$tomlValue", 1)

  if ($updated -eq $Content) {
    throw "Cle TOML introuvable: [$SectionName] $Key"
  }

  return $updated
}

function Write-Utf8NoBomFile {
  param(
    [string]$Path,
    [string]$Content
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Resolve-Path $Path), $Content, $encoding)
}

function Set-LocalSupabaseTestPorts {
  param(
    [string]$ConfigFile = "supabase/config.toml",
    [switch]$DisableStorage
  )

  if (-not (Test-Path $ConfigFile)) {
    throw "Config Supabase introuvable: $ConfigFile"
  }

  $raw = Get-Content $ConfigFile -Raw
  $usedPorts = @()
  $ports = [ordered]@{}

  foreach ($name in @("api", "db", "shadow", "pooler", "studio", "inbucket", "analytics", "edgeInspector")) {
    $port = Get-FreeLocalTcpPort -Exclude $usedPorts
    $ports[$name] = $port
    $usedPorts += $port
  }

  $updated = $raw
  $updated = Set-TomlIntegerValueInSection -Content $updated -SectionName "api" -Key "port" -Value $ports.api
  $updated = Set-TomlIntegerValueInSection -Content $updated -SectionName "db" -Key "port" -Value $ports.db
  $updated = Set-TomlIntegerValueInSection -Content $updated -SectionName "db" -Key "shadow_port" -Value $ports.shadow
  $updated = Set-TomlIntegerValueInSection -Content $updated -SectionName "db.pooler" -Key "port" -Value $ports.pooler
  $updated = Set-TomlIntegerValueInSection -Content $updated -SectionName "studio" -Key "port" -Value $ports.studio
  $updated = Set-TomlIntegerValueInSection -Content $updated -SectionName "inbucket" -Key "port" -Value $ports.inbucket
  $updated = Set-TomlIntegerValueInSection -Content $updated -SectionName "analytics" -Key "port" -Value $ports.analytics
  $updated = Set-TomlIntegerValueInSection -Content $updated -SectionName "edge_runtime" -Key "inspector_port" -Value $ports.edgeInspector

  if ($DisableStorage) {
    $updated = Set-TomlBooleanValueInSection -Content $updated -SectionName "storage" -Key "enabled" -Value $false
    $updated = Set-TomlBooleanValueInSection -Content $updated -SectionName "storage.s3_protocol" -Key "enabled" -Value $false
  }

  $backupPath = "$ConfigFile.local-test-backup.$PID"
  Copy-Item $ConfigFile $backupPath -Force
  Write-Utf8NoBomFile -Path $ConfigFile -Content $updated

  return [pscustomobject]@{
    BackupPath = $backupPath
    Ports = $ports
  }
}

function Restore-LocalSupabaseConfig {
  param(
    [string]$ConfigFile = "supabase/config.toml",
    [AllowNull()][string]$BackupPath
  )

  if (-not [string]::IsNullOrWhiteSpace($BackupPath) -and (Test-Path $BackupPath)) {
    Move-Item -Path $BackupPath -Destination $ConfigFile -Force
  }
}
