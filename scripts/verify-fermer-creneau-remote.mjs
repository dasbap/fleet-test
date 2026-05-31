#!/usr/bin/env node
/** Vérifie via API Supabase l'état des migrations planning + fermer_creneau km. */
import { createClient } from '@supabase/supabase-js';
import { loadEnvWithLocalFallback } from './_env-loader.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

loadEnvWithLocalFallback(join(dirname(fileURLToPath(import.meta.url)), '..'));

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('ERREUR: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function checkTable(name) {
  const { error } = await supabase.from(name).select('id').limit(1);
  if (!error) return { ok: true };
  const msg = error.message ?? '';
  if (msg.includes('does not exist') || error.code === '42P01') {
    return { ok: false, reason: 'table absente' };
  }
  return { ok: true, note: msg };
}

async function checkMigrationsList() {
  const { data, error } = await supabase.rpc('liste_migrations_appliquees');
  if (error) return { ok: false, reason: error.message };
  const ids = (data ?? []).map((v) => String(v).replace(/\.sql$/i, ''));
  const needed = ['20260531120000_planning_creneaux', '20260531140000_fermer_creneau_update_vehicle_km'];
  const missing = needed.filter((m) => !ids.some((id) => id.includes(m.split('_')[0])));
  return { ok: missing.length === 0, missing, applied: ids.length };
}

async function main() {
  console.log('=== Vérification API Supabase ===\n');

  const planning = await checkTable('planning_creneaux');
  console.log(
    planning.ok ? 'OK' : 'KO',
    'planning_creneaux:',
    planning.ok ? 'table accessible' : planning.reason,
  );

  const migrations = await checkMigrationsList();
  if (migrations.applied != null) {
    console.log(
      migrations.ok ? 'OK' : 'KO',
      'migrations RPC:',
      migrations.ok
        ? `${migrations.applied} appliquée(s), cibles présentes`
        : `manquantes: ${migrations.missing?.join(', ')}`,
    );
  } else {
    console.log('WARN migrations RPC:', migrations.reason);
  }

  console.log('\nNote: la mise à jour km dans fermer_creneau nécessite une connexion PostgreSQL directe pour lire pg_get_functiondef.');
  process.exit(planning.ok && migrations.ok ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
