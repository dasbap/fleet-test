# =====================================================
# Tests SQL sécurité RLS/RPC (local)
# =====================================================

$ErrorActionPreference = "Stop"

$tests = @(
  "supabase/tests/01_security_invariants.sql",
  "supabase/tests/02_policy_coverage.sql",
  "supabase/tests/03_invitation_guardrails.sql",
  "supabase/tests/04_post_migration_objects.sql"
)

function Invoke-SupabaseCommand {
  param([string[]]$CommandArgs)
  if ($env:CI_SUPABASE_DEBUG -eq "true") {
    $CommandArgs = @($CommandArgs + "--debug")
  }
  & npx supabase @CommandArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Commande Supabase en echec: npx supabase $($CommandArgs -join ' ')"
  }
}

function Ensure-SupabaseRunning {
  try {
    Invoke-SupabaseCommand -CommandArgs @("status")
    return
  }
  catch {
    Write-Host "INFO: Stack Supabase absente, demarrage sans vector/logflare..." -ForegroundColor Yellow
    Invoke-SupabaseCommand -CommandArgs @("start", "-x", "vector,logflare")
  }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTS SQL SECURITE (RLS/RPC)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

foreach ($testFile in $tests) {
  if (-not (Test-Path $testFile)) {
    Write-Host "ERREUR: Fichier de test introuvable: $testFile" -ForegroundColor Red
    exit 1
  }
}

try {
  Write-Host "1) Verification stack Supabase locale..." -ForegroundColor Cyan
  Ensure-SupabaseRunning

  # Le script test-baseline-delta.ps1 laisse la DB dans l'etat baseline+deltas partiels.
  # On reapplique ici l'ensemble complet des migrations pour que les tests de couverture
  # RLS (02_policy_coverage.sql) voient les tables recentes (alert_comments, notification_tokens, ...).
  Write-Host "1b) Reset DB avec toutes les migrations (supabase/migrations/)..." -ForegroundColor Cyan
  Invoke-SupabaseCommand -CommandArgs @("db", "reset", "--no-seed")

  Write-Host "2) Execution des tests SQL..." -ForegroundColor Cyan
  foreach ($testFile in $tests) {
    Write-Host " - $testFile" -ForegroundColor DarkCyan
    Invoke-SupabaseCommand -CommandArgs @("db", "query", "--file", $testFile)
  }

  Write-Host ""
  Write-Host "OK: Tous les tests SQL securite sont passes." -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "ERREUR: Echec des tests SQL securite." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  exit 1
}

