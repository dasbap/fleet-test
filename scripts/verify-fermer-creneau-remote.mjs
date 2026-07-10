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
  const needed = [
    '20260531120000_planning_creneaux',
    '20260531140000_fermer_creneau_update_vehicle_km',
    '20260531150000_fermer_creneau_greatest_km_end',
  ];
  const missing = needed.filter((m) => !ids.some((id) => id.includes(m.split('_')[0])));
  return { ok: missing.length === 0, missing, applied: ids.length };
}

async function checkFermerCreneauDefinition() {
  const { data, error } = await supabase.rpc('exec_sql_readonly', {
    query: `SELECT pg_get_functiondef('public.fermer_creneau(uuid,integer,integer,text,text,text,text)'::regprocedure) AS def`,
  });

  if (error?.code === 'PGRST202' || error?.message?.includes('Could not find the function')) {
    return { ok: null, note: 'RPC exec_sql_readonly absente — vérification définition ignorée' };
  }
  if (error) return { ok: false, reason: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  const def = String(row?.def ?? '').toLowerCase();
  const updatesVehicles =
    def.includes('update vehicules') || def.includes('update public.vehicules');
  if (!updatesVehicles || !def.includes('greatest')) {
    return { ok: false, reason: 'corps fermer_creneau sans UPDATE vehicules/GREATEST' };
  }
  return { ok: true };
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

  const fnDef = await checkFermerCreneauDefinition();
  if (fnDef.ok === true) {
    console.log('OK fermer_creneau: UPDATE vehicules + GREATEST présents');
  } else if (fnDef.ok === false) {
    console.log('KO fermer_creneau définition:', fnDef.reason);
  } else {
    console.log('WARN fermer_creneau définition:', fnDef.note);
    console.log('      Exécuter supabase/tests/07_fermer_creneau_behavior.sql en local/linked.');
  }

  const allOk = planning.ok && migrations.ok && fnDef.ok !== false;
  process.exit(allOk ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
