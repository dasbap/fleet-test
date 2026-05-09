# =====================================================
# VERIFICATION DE LA COHERENCE BASE DE DONNEES / CODE
# Smart Fleet Africa
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION COHERENCE DB/CODE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$schemaFile = "supabase/schema.sql"
$issues = @()

if (-not (Test-Path $schemaFile)) {
    Write-Host "ERREUR: Fichier schema.sql introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "Analyse du schema SQL..." -ForegroundColor Yellow
$schemaContent = Get-Content $schemaFile -Raw

# Extraire les noms de tables
$tables = @()
if ($schemaContent -match "(?s)create table (\w+)") {
    $matches = [regex]::Matches($schemaContent, "create table (\w+)")
    foreach ($match in $matches) {
        $tables += $match.Groups[1].Value
    }
}

Write-Host "Tables trouvees dans le schema:" -ForegroundColor Cyan
foreach ($table in $tables) {
    Write-Host "  - $table" -ForegroundColor White
}

Write-Host ""
Write-Host "Verification des references dans le code..." -ForegroundColor Yellow

# Chercher les references .from() dans le code
$codeFiles = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Where-Object { $_.FullName -notmatch "node_modules" }

$tableReferences = @{}
foreach ($file in $codeFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "\.from\(['""](\w+)['""]") {
        $matches = [regex]::Matches($content, "\.from\(['""](\w+)['""]")
        foreach ($match in $matches) {
            $tableName = $match.Groups[1].Value
            if (-not $tableReferences.ContainsKey($tableName)) {
                $tableReferences[$tableName] = @()
            }
            $tableReferences[$tableName] += $file.Name
        }
    }
}

Write-Host ""
Write-Host "Tables referencees dans le code:" -ForegroundColor Cyan
foreach ($table in $tableReferences.Keys | Sort-Object) {
    Write-Host "  - $table" -ForegroundColor White
    Write-Host "    Fichiers: $($tableReferences[$table] -join ', ')" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Verification des incohérences..." -ForegroundColor Yellow

# Verifier que toutes les tables referencees existent dans le schema
foreach ($tableRef in $tableReferences.Keys) {
    if ($tables -notcontains $tableRef) {
        $issues += "Table '$tableRef' referencee dans le code mais absente du schema"
        Write-Host "  ATTENTION: Table '$tableRef' referencee mais absente du schema" -ForegroundColor Red
    }
}

# Verifier que toutes les tables du schema sont referencees (optionnel)
foreach ($table in $tables) {
    if (-not $tableReferences.ContainsKey($table)) {
        Write-Host "  INFO: Table '$table' dans le schema mais non referencee dans le code" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($issues.Count -eq 0) {
    Write-Host "Aucune incohérence majeure detectee" -ForegroundColor Green
} else {
    Write-Host "$($issues.Count) incohérence(s) detectee(s):" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
