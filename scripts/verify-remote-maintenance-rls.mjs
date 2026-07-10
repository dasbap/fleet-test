#!/usr/bin/env node

import pg from 'pg';

function resolveDatabaseUrl() {
  const direct = process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim();
  if (direct) return direct;

  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (dbUrl) return dbUrl;

  const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  if (dbPassword && supabaseUrl) {
    const ref = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
    if (ref) {
      return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
    }
  }

  return null;
}

const url = resolveDatabaseUrl();
if (!url) {
  console.error(
    'ERREUR: connexion DB manquante (.env.local). Ajoutez DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL',
  );
  process.exit(1);
}

const expectedPolicies = [
  'rbac_travaux_read',
  'rbac_travaux_write',
  'travaux_insertion_mgr_org_mec',
  'rbac_travaux_update',
  'rbac_travaux_delete',
  'travaux_modification_mgr_org_mec',
  'travaux_suppression_mgr_org',
  'travaux_lecture_mgr_org_mec',
];

const forbiddenAdminPolicies = new Set([
  'superadmin_all_travaux_maintenance',
]);

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();

  const tableResult = await client.query(`
    SELECT relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE oid = 'public.travaux_maintenance'::regclass
  `);

  const policiesResult = await client.query(`
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'travaux_maintenance'
    ORDER BY cmd, policyname
  `);

  const existing = new Set(policiesResult.rows.map((row) => row.policyname));
  const missing = expectedPolicies.filter((policy) => !existing.has(policy));
  const forbidden = policiesResult.rows
    .filter((row) => forbiddenAdminPolicies.has(row.policyname))
    .map((row) => row.policyname);

  console.log(JSON.stringify({
    table: 'public.travaux_maintenance',
    rls: tableResult.rows[0] ?? null,
    missing,
    forbidden,
    policies: policiesResult.rows,
  }, null, 2));
} catch (err) {
  console.error('ERREUR:', err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
