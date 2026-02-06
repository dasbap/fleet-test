# Script de verification du backend Smart Fleet Africa
# Verifie la configuration Supabase et les integrations

Write-Host "Verification du backend Smart Fleet Africa..." -ForegroundColor Cyan
Write-Host ""

# =====================================================
# 1. VERIFICATION DE LA CONFIGURATION
# =====================================================

Write-Host "1. Configuration Supabase..." -ForegroundColor Yellow

if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    $hasUrl = $envContent -match "VITE_SUPABASE_URL\s*="
    $hasKey = $envContent -match "VITE_SUPABASE_ANON_KEY\s*="
    
    if ($hasUrl -and $hasKey) {
        Write-Host "   OK: Fichier .env.local configure" -ForegroundColor Green
    } else {
        Write-Host "   ERREUR: Variables manquantes dans .env.local" -ForegroundColor Red
    }
} else {
    Write-Host "   ERREUR: Fichier .env.local introuvable" -ForegroundColor Red
    Write-Host "   Executez: npm run init:env" -ForegroundColor Yellow
}

# Verifier le fichier client.ts
if (Test-Path "src/integrations/supabase/client.ts") {
    $clientContent = Get-Content "src/integrations/supabase/client.ts" -Raw
    if ($clientContent -match "import\.meta\.env\.VITE_SUPABASE_URL") {
        Write-Host "   OK: client.ts utilise les variables d'environnement" -ForegroundColor Green
    } else {
        Write-Host "   ATTENTION: client.ts pourrait avoir des valeurs hardcodees" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ERREUR: Fichier client.ts introuvable" -ForegroundColor Red
}

# =====================================================
# 2. VERIFICATION DES FONCTIONS RPC
# =====================================================

Write-Host ""
Write-Host "2. Fonctions RPC..." -ForegroundColor Yellow

# Fonctions RPC utilisees dans le code
$rpcUsed = @(
    "assign_vehicle",
    "close_shift",
    "accept_invitation",
    "check_system_health",
    "repair_orphan_membership"
)

# Fonctions RPC definies dans le schema
$rpcDefined = @()

if (Test-Path "supabase/schema.sql") {
    $schemaContent = Get-Content "supabase/schema.sql" -Raw
    if ($schemaContent -match "create or replace function assign_vehicle") {
        $rpcDefined += "assign_vehicle"
    }
    if ($schemaContent -match "create or replace function close_shift") {
        $rpcDefined += "close_shift"
    }
}

if (Test-Path "supabase/rpc-consistency.sql") {
    $rpcConsistencyContent = Get-Content "supabase/rpc-consistency.sql" -Raw
    if ($rpcConsistencyContent -match "create or replace function check_orphaned_data") {
        $rpcDefined += "check_orphaned_data"
    }
    if ($rpcConsistencyContent -match "create or replace function cleanup_orphaned_data") {
        $rpcDefined += "cleanup_orphaned_data"
    }
}

if (Test-Path "supabase/rpc-missing-functions.sql") {
    $rpcMissingContent = Get-Content "supabase/rpc-missing-functions.sql" -Raw
    if ($rpcMissingContent -match "create or replace function accept_invitation") {
        $rpcDefined += "accept_invitation"
    }
    if ($rpcMissingContent -match "create or replace function check_system_health") {
        $rpcDefined += "check_system_health"
    }
    if ($rpcMissingContent -match "create or replace function repair_orphan_membership") {
        $rpcDefined += "repair_orphan_membership"
    }
}

Write-Host "   Fonctions RPC utilisees dans le code:" -ForegroundColor Cyan
foreach ($rpc in $rpcUsed) {
    if ($rpcDefined -contains $rpc) {
        Write-Host "     OK: $rpc" -ForegroundColor Green
    } else {
        Write-Host "     ATTENTION: $rpc utilisee mais pas trouvee dans les schemas SQL" -ForegroundColor Yellow
    }
}

Write-Host "   Fonctions RPC definies dans les schemas:" -ForegroundColor Cyan
foreach ($rpc in $rpcDefined) {
    Write-Host "     - $rpc" -ForegroundColor White
}

# =====================================================
# 3. VERIFICATION DES TABLES UTILISEES
# =====================================================

Write-Host ""
Write-Host "3. Tables utilisees..." -ForegroundColor Yellow

$tablesUsed = @(
    "orgs",
    "fleets",
    "profiles",
    "fleet_memberships",
    "fleet_invitations",
    "vehicles",
    "driver_vehicle_assignments",
    "driver_shifts",
    "driver_shift_closures",
    "incidents",
    "maintenance_jobs",
    "maintenance_evidence",
    "maintenance_checklists"
)

$tablesDefined = @()

if (Test-Path "supabase/schema.sql") {
    $schemaContent = Get-Content "supabase/schema.sql" -Raw
    foreach ($table in $tablesUsed) {
        if ($schemaContent -match "create table $table") {
            $tablesDefined += $table
        }
    }
}

$missingTables = $tablesUsed | Where-Object { $tablesDefined -notcontains $_ }

if ($missingTables.Count -eq 0) {
    Write-Host "   OK: Toutes les tables utilisees sont definies dans le schema" -ForegroundColor Green
} else {
    Write-Host "   ERREUR: Tables manquantes dans le schema:" -ForegroundColor Red
    foreach ($table in $missingTables) {
        Write-Host "     - $table" -ForegroundColor Red
    }
}

# =====================================================
# 4. VERIFICATION DES HOOKS
# =====================================================

Write-Host ""
Write-Host "4. Hooks backend..." -ForegroundColor Yellow

$hooks = @(
    "useAuth.ts",
    "useVehicles.ts",
    "useAssignments.ts",
    "useIncidents.ts",
    "useMaintenance.ts",
    "useDriverShifts.ts",
    "useDashboardStats.ts",
    "useFleetReport.ts"
)

$hooksFound = 0
foreach ($hook in $hooks) {
    if (Test-Path "src/hooks/$hook") {
        $hooksFound++
    }
}

Write-Host "   Hooks trouves: $hooksFound/$($hooks.Count)" -ForegroundColor $(if ($hooksFound -eq $hooks.Count) { "Green" } else { "Yellow" })

# =====================================================
# 5. VERIFICATION DES DEPENDANCES
# =====================================================

Write-Host ""
Write-Host "5. Dependances backend..." -ForegroundColor Yellow

if (Test-Path "package.json") {
    $packageContent = Get-Content "package.json" -Raw | ConvertFrom-Json
    
    $requiredDeps = @(
        "@supabase/supabase-js",
        "@tanstack/react-query"
    )
    
    foreach ($dep in $requiredDeps) {
        $depName = $dep -replace "@.*?/", ""
        if ($packageContent.dependencies.PSObject.Properties.Name -contains $dep) {
            $version = $packageContent.dependencies.$dep
            Write-Host "   OK: $dep ($version)" -ForegroundColor Green
        } else {
            Write-Host "   ERREUR: $dep manquant" -ForegroundColor Red
        }
    }
}

# =====================================================
# 6. RECOMMANDATIONS
# =====================================================

Write-Host ""
Write-Host "6. Recommandations..." -ForegroundColor Yellow

$recommendations = @()

# Verifier si les fonctions RPC de verification sont disponibles
if (-not (Test-Path "supabase/rpc-consistency.sql")) {
    $recommendations += "Creer les fonctions RPC de verification (supabase/rpc-consistency.sql)"
}

# Verifier si le schema a ete execute
if (Test-Path "supabase/schema.sql") {
    Write-Host "   Schema SQL disponible: supabase/schema.sql" -ForegroundColor Cyan
    Write-Host "   Assurez-vous de l'avoir execute dans Supabase Dashboard" -ForegroundColor White
}

if ($recommendations.Count -gt 0) {
    Write-Host "   Actions recommandees:" -ForegroundColor Cyan
    foreach ($rec in $recommendations) {
        Write-Host "     - $rec" -ForegroundColor White
    }
} else {
    Write-Host "   Aucune action recommandee" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verification terminee!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour tester la connexion Supabase:" -ForegroundColor Yellow
Write-Host "   npm run check:supabase" -ForegroundColor White
