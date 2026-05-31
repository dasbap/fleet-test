#!/usr/bin/env node
/**
 * Teste valider_code_invitation pour un code donné.
 * Usage: node scripts/test-invitation-code.js INV-7UZHKQ
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const code = (process.argv[2] || 'INV-7UZHKQ').trim().toUpperCase();

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

async function main() {
  if (!url || !anonKey) {
    console.error('ERREUR: VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requis dans .env.local');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

  console.log(`Test RPC valider_code_invitation pour: ${code}\n`);

  const { data, error } = await supabase.rpc('valider_code_invitation', { p_code: code });

  if (error) {
    console.error('ERREUR RPC:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.details) console.error('Détails:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }

  console.log('Réponse:', JSON.stringify(data, null, 2));
  const valid = data?.valid === true;
  console.log(valid ? '\n✅ Code valide' : `\n❌ Code invalide (raison: ${data?.reason ?? 'inconnue'})`);
  process.exit(valid ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
