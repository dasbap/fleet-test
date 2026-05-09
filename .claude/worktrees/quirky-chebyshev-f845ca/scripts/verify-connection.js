#!/usr/bin/env node
/**
 * Vérifie la connexion à l'API Supabase (URL + clé anon).
 * Lit .env.local pour VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.
 * Usage : node scripts/verify-connection.js
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

async function main() {
  if (!url || !anonKey) {
    console.error('ERREUR: VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requis dans .env.local');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

  try {
    // Test API : une requête légère (RLS peut renvoyer [])
    const { data, error } = await supabase.from('organisations').select('id').limit(1);
    if (error) {
      console.error('Connexion API : ERREUR', error.message);
      if (error.code) console.error('Code:', error.code);
      process.exit(1);
    }
    console.log('Connexion API : OK');
    console.log('Organisations (échantillon):', Array.isArray(data) ? data.length : 0, 'ligne(s)');
  } catch (err) {
    console.error('Connexion réseau / config :', err.message);
    process.exit(1);
  }
}

main();
