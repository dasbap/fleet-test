#!/usr/bin/env node
/**
 * Vérification automatisée des résultats attendus ESAMBA.
 * Appelle la RPC verifier_esamba_2024() et valide les 4 critères données.
 * Lit .env.local pour VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.
 * Usage : node scripts/verify-esamba-expected.js
 * Code de sortie : 0 si tous les critères données sont OK, 1 sinon.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvLocal() {
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const v = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  });
}

loadEnvLocal();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
/** Ops/CI : service_role ; navigateur : anon + session authenticated */
const apiKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || anonKey;
const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

const CRITERES_DONNEES = [
  { key: 'organisation', label: 'Organisation ESAMBA' },
  { key: 'flotte', label: 'Flotte ESAMBA' },
  { key: 'vehicule_esamba_001', label: 'Véhicule ESAMBA-001' },
  { key: 'invitation_esamba_2024', label: 'Invitation ESAMBA-2024' },
];

async function main() {
  if (!url || !apiKey) {
    console.error(
      'ERREUR: VITE_SUPABASE_URL et (VITE_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY) requis dans .env.local',
    );
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, apiKey, { auth: { persistSession: false } });

  console.log('Vérification des résultats attendus ESAMBA (RPC verifier_esamba_2024)...\n');
  if (usingServiceRole) {
    console.log('(clé service_role — membership_organizer sera KO sans auth.uid())\n');
  } else {
    console.log('(clé anon — connectez-vous dans l’app ou définissez SUPABASE_SERVICE_ROLE_KEY)\n');
  }

  const { data, error } = await supabase.rpc('verifier_esamba_2024');
  if (error) {
    console.error('ERREUR RPC:', error.message);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!row) {
    console.error('ERREUR: La RPC n\'a retourné aucune ligne.');
    process.exit(1);
  }

  let allOk = true;
  for (const { key, label } of CRITERES_DONNEES) {
    const ok = row[key] === true;
    if (!ok) allOk = false;
    console.log(ok ? '  OK' : '  KO', label);
  }

  if (row.membership_organizer !== true) {
    console.log('  -- Membership Organizer : non vérifié (nécessite un utilisateur connecté, voir page Paramètres)');
  } else {
    console.log('  OK Membership Organizer');
  }

  console.log('');
  if (allOk) {
    console.log('Résultat : tous les critères données sont présents.');
    process.exit(0);
  } else {
    console.log('Résultat : au moins un critère est absent. Exécutez le seed ou vérifiez la base.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
