#!/usr/bin/env node
/**
 * Audit RLS public.travaux_maintenance — comparaison migrations vs prod.
 * Préfère : npx supabase db query --linked -f supabase/tests/09_travaux_maintenance_rls_functional.sql
 * Alternative : SUPABASE_DB_URL / SUPABASE_DB_PASSWORD dans .env.local
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvLocal() {
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) return;
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

function getConnectionString() {
  let conn = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!conn && process.env.SUPABASE_DB_PASSWORD) {
    const ref =
      (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ||
      'zqxjvmejoktwlcqshnwi';
    conn = `postgresql://postgres.${ref}:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`;
  }
  return conn;
}

const QUERIES = {
  policies: `
    SELECT policyname, cmd, permissive, roles, qual AS using_expr, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'travaux_maintenance'
    ORDER BY cmd, policyname
  `,
  rlsStatus: `
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'travaux_maintenance'
  `,
  legacy: `
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'travaux_maintenance'
      AND policyname IN (
        'travaux_lecture_mgr_org_mec',
        'jobs_read_mgr_org_mech',
        'demo_isolation_travaux',
        'superadmin_all_travaux_maintenance'
      )
  `,
  policyCoverage: readFileSync(join(root, 'supabase', 'tests', '02_policy_coverage.sql'), 'utf8'),
};

async function main() {
  loadEnvLocal();
  const conn = getConnectionString();
  if (!conn) {
    console.error('Connexion DB manquante (SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD).');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: conn });
  await client.connect();

  try {
    const [policies, rlsStatus, legacy] = await Promise.all([
      client.query(QUERIES.policies),
      client.query(QUERIES.rlsStatus),
      client.query(QUERIES.legacy),
    ]);

    console.log(JSON.stringify({
      policies: policies.rows,
      rlsStatus: rlsStatus.rows,
      legacyPolicies: legacy.rows,
    }, null, 2));

    try {
      await client.query(QUERIES.policyCoverage);
      console.error('\n[OK] 02_policy_coverage.sql');
    } catch (e) {
      console.error('\n[FAIL] 02_policy_coverage.sql:', e.message);
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
