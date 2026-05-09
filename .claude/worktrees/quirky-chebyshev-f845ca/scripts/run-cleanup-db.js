#!/usr/bin/env node
/**
 * Exécute le nettoyage de la base (réparations) sans intervention manuelle.
 * Lit .env.local : SUPABASE_DB_PASSWORD ou SUPABASE_DB_URL.
 * Optionnel : SUPABASE_SERVICE_ROLE_KEY pour appeler l’RPC si la fonction existe déjà.
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

const dbUrl = process.env.SUPABASE_DB_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;

async function runViaRpc() {
  if (!serviceRoleKey || !supabaseUrl) return false;
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  try {
    const { data, error } = await supabase.rpc('nettoyer_base_donnees', { p_dry_run: false });
    if (error) {
      if (error.code === '42883' || error.message?.includes('does not exist')) return false;
      throw error;
    }
    console.log('Résultat nettoyage:', JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    if (e.code === '42883') return false;
    throw e;
  }
}

async function runViaPg() {
  let connString = dbUrl;
  if (!connString && dbPassword) {
    const poolerPath = join(root, 'supabase', '.temp', 'pooler-url');
    if (!existsSync(poolerPath)) {
      const ref = (supabaseUrl || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || 'zqxjvmejoktwlcqshnwi';
      connString = `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`;
    } else {
      const pooler = readFileSync(poolerPath, 'utf8').trim();
      connString = pooler.replace(/^(postgresql:\/\/[^@]+)@/, `$1:${encodeURIComponent(dbPassword)}@`);
    }
  }
  if (!connString) return false;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: connString });
  try {
    await client.connect();
    const sql = readFileSync(join(root, 'supabase', 'cleanup-database-consistency.sql'), 'utf8');
    await client.query(sql);
    const res = await client.query('SELECT nettoyer_base_donnees(false) AS nettoyage_reel');
    if (res.rows?.[0]?.nettoyage_reel) {
      console.log('Nettoyage exécuté:', JSON.stringify(res.rows[0].nettoyage_reel, null, 2));
    }
    return true;
  } finally {
    await client.end().catch(() => {});
  }
}

(async () => {
  try {
    const done = (await runViaRpc()) || (await runViaPg());
    if (!done) {
      console.error('Config manquante. Ajoutez dans .env.local :');
      console.error('  - SUPABASE_SERVICE_ROLE_KEY (Dashboard > Settings > API), ou');
      console.error('  - SUPABASE_DB_PASSWORD (mot de passe DB Supabase)');
      process.exit(1);
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();
