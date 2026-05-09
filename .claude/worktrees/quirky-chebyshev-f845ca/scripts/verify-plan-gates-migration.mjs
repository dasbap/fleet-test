#!/usr/bin/env node
/**
 * Vérifie sans interaction que la migration plan gates (rapports / scoring / anomalies)
 * est appliquée et que la ligne plan `free` est cohérente.
 *
 * Requis : .env.local avec VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 * Usage : node scripts/verify-plan-gates-migration.mjs
 * CI : ajouter les secrets puis npm run verify:plan-gates-migration
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvFile(relPath) {
  const envPath = join(root, relPath);
  if (!existsSync(envPath)) return false;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const v = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  });
  return true;
}

/** .env.local puis .env (ne surcharge pas les variables déjà exportées dans le shell). */
function loadEnvFiles() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');
}

loadEnvFiles();

const MIGRATION_VERSION = '20260417120000';

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const missing = [];
    if (!url) missing.push('VITE_SUPABASE_URL');
    if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    const hasLocal = existsSync(join(root, '.env.local'));
    const hasEnv = existsSync(join(root, '.env'));
    console.error(`ERREUR: variable(s) manquante(s) : ${missing.join(', ')}.`);
    console.error(
      'Ajoutez-les dans .env.local (recommandé) ou .env, ou exportez-les dans le terminal.',
    );
    console.error(
      `Fichiers détectés : .env.local=${hasLocal ? 'oui' : 'non'}, .env=${hasEnv ? 'oui' : 'non'}`,
    );
    if (!serviceRoleKey) {
      console.error(
        'SUPABASE_SERVICE_ROLE_KEY : Dashboard Supabase → Settings → API → service_role (secret).',
      );
    }
    process.exit(2);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: versions, error: errVersions } = await supabase.rpc('liste_migrations_appliquees');
  if (errVersions) {
    console.error('ERREUR liste_migrations_appliquees:', errVersions.message);
    process.exit(1);
  }

  const list = Array.isArray(versions) ? versions : [];
  const applied = list.some((v) => String(v).startsWith(MIGRATION_VERSION));
  if (!applied) {
    console.error(
      `ERREUR: la migration ${MIGRATION_VERSION} n’apparaît pas dans supabase_migrations (appliquez: supabase db push ou MCP apply_migration).`,
    );
    console.error('Versions connues (extrait):', list.slice(-5).join(', '));
    process.exit(1);
  }
  console.log(`OK: migration ${MIGRATION_VERSION} enregistrée côté base.`);

  const { data: plan, error: errPlan } = await supabase
    .from('plans')
    .select('code, max_vehicles, enables_reports, enables_driver_scoring, enables_anomaly_insights')
    .eq('code', 'free')
    .maybeSingle();

  if (errPlan) {
    console.error('ERREUR lecture plans (free):', errPlan.message);
    process.exit(1);
  }
  if (!plan) {
    console.error('ERREUR: aucune ligne plans.code = free.');
    process.exit(1);
  }

  const ok =
    plan.max_vehicles === 3 &&
    plan.enables_reports === false &&
    plan.enables_driver_scoring === false &&
    plan.enables_anomaly_insights === false;

  if (!ok) {
    console.error('ERREUR: ligne plan free incohérente:', plan);
    process.exit(1);
  }
  console.log('OK: plan free (3 véhicules, rapports/scoring/anomalies désactivés).');
  console.log('Vérification plan gates terminée avec succès.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
