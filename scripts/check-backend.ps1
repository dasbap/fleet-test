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
# 2. VERIFICATION DES FONCTIONS RPC (noms francais)
# =====================================================

Write-Host ""
Write-Host "2. Fonctions RPC..." -ForegroundColor Yellow

# Fonctions RPC attendues par le backend (noms francais)
$rpcUsed = @(
    "affecter_vehicule",
    "fermer_creneau",
    "accepter_invitation",
    "verifier_sante_systeme",
    "reparer_adhesion_orpheline",
    "creer_flotte_esamba",
    "creer_ou_mettre_a_jour_adhesion_flotte",
    "creer_vehicule_esamba",
    "creer_invitation_esamba",
    "verifier_esamba_2024",
    "ajouter_membre_par_email",
    "assurer_profil_utilisateur",
    "rechercher_utilisateurs",
    "calculer_recette_attendue",
    "generer_alertes_automatiques",
    "calculer_score_conducteur"
)

# Scanner tous les fichiers SQL (schema, migrations, rpc-*.sql) pour les definitions
$rpcDefined = @()
$sqlFiles = @()
if (Test-Path "supabase/schema.sql") { $sqlFiles += "supabase/schema.sql" }
if (Test-Path "supabase/migrations") {
    $sqlFiles += Get-ChildItem "supabase/migrations/*.sql" -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
}
Get-ChildItem "supabase/rpc-*.sql" -ErrorAction SilentlyContinue | ForEach-Object { $sqlFiles += $_.FullName }

foreach ($sqlFile in $sqlFiles) {
    $content = Get-Content $sqlFile -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    $contentLower = $content.ToLowerInvariant()
    foreach ($rpc in $rpcUsed) {
        if ($rpcDefined -contains $rpc) { continue }
        $pattern = "create\s+or\s+replace\s+function\s+(?:public\.)?\s*$([regex]::Escape($rpc))\s*\("
        if ($contentLower -match $pattern) {
            $rpcDefined += $rpc
        }
    }
}
# RPC de maintenance (optionnelles)
foreach ($sqlFile in $sqlFiles) {
    $content = Get-Content $sqlFile -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    $contentLower = $content.ToLowerInvariant()
    @("check_orphaned_data", "cleanup_orphaned_data") | ForEach-Object {
        $r = $_
        if ($rpcDefined -notcontains $r -and $contentLower -match "create\s+or\s+replace\s+function\s+(?:public\.)?\s*$([regex]::Escape($r))\s*\(") {
            $rpcDefined += $r
        }
    }
}

Write-Host "   Fonctions RPC attendues (backend):" -ForegroundColor Cyan
foreach ($rpc in $rpcUsed) {
    if ($rpcDefined -contains $rpc) {
        Write-Host "     OK: $rpc" -ForegroundColor Green
    } else {
        Write-Host "     ATTENTION: $rpc attendue mais pas trouvee dans les schemas/migrations SQL" -ForegroundColor Yellow
    }
}

Write-Host "   Fonctions RPC definies dans schemas/migrations:" -ForegroundColor Cyan
foreach ($rpc in ($rpcDefined | Sort-Object -Unique)) {
    Write-Host "     - $rpc" -ForegroundColor White
}

# =====================================================
# 3. VERIFICATION DES TABLES (noms francais)
# =====================================================

Write-Host ""
Write-Host "3. Tables utilisees..." -ForegroundColor Yellow

# Tables attendues par le backend (noms francais, schema actuel)
$tablesUsed = @(
    "organisations",
    "flottes",
    "profils",
    "flotte_adhesions",
    "flotte_invitations",
    "vehicules",
    "affectations_vehicules",
    "creneaux_conducteurs",
    "clotures_creneaux",
    "incidents",
    "travaux_maintenance",
    "preuves_maintenance",
    "listes_verification_maintenance",
    "plans",
    "paiements",
    "abonnements",
    "droits_vehicules",
    "jetons_qr"
)

$tablesDefined = @()
$tableSqlFiles = @()
if (Test-Path "supabase/schema.sql") { $tableSqlFiles += "supabase/schema.sql" }
if (Test-Path "supabase/migrations") {
    $tableSqlFiles += Get-ChildItem "supabase/migrations/*.sql" -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }
}

foreach ($sqlFile in $tableSqlFiles) {
    $content = Get-Content $sqlFile -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    $contentLower = $content.ToLowerInvariant()
    foreach ($table in $tablesUsed) {
        if ($tablesDefined -contains $table) { continue }
        if ($contentLower -match "create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?\s*$([regex]::Escape($table))\s*\(") {
            $tablesDefined += $table
        }
    }
}

$missingTables = $tablesUsed | Where-Object { $tablesDefined -notcontains $_ }

if ($missingTables.Count -eq 0) {
    Write-Host "   OK: Toutes les tables attendues sont definies dans le schema/migrations" -ForegroundColor Green
} else {
    Write-Host "   ERREUR: Tables manquantes dans le schema/migrations:" -ForegroundColor Red
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
