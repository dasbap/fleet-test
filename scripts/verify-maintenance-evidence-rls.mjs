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
  'preuves_maintenance_select_fleet_role',
  'preuves_maintenance_insert_fleet_role',
  'preuves_maintenance_delete_fleet_role',
];

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();

  const tableResult = await client.query(`
    SELECT relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE oid = 'public.preuves_maintenance'::regclass
  `);

  const policiesResult = await client.query(`
    SELECT policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'preuves_maintenance'
    ORDER BY cmd, policyname
  `);

  const table = tableResult.rows[0] ?? null;
  const policyNames = new Set(policiesResult.rows.map((row) => row.policyname));
  const errors = [];

  if (!table?.relrowsecurity) errors.push('RLS non activee sur public.preuves_maintenance');
  for (const policy of expectedPolicies) {
    if (!policyNames.has(policy)) errors.push(`policy manquante: ${policy}`);
  }
  if (policyNames.has('preuves_insertion_mec')) {
    errors.push('ancienne policy restrictive preuves_insertion_mec encore presente');
  }

  console.log(JSON.stringify({
    table,
    policies: policiesResult.rows,
    errors,
  }, null, 2));

  if (errors.length > 0) process.exit(1);
} catch (err) {
  console.error('ERREUR:', err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
