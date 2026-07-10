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

const requiredColumns = [
  'id',
  'fleet_id',
  'user_id',
  'message',
  'rating',
  'created_at',
  'nps_trigger',
  'entity_id',
  'entity_type',
];

const expectedPolicies = [
  'feedback_select_own',
  'feedback_insert_own',
  'feedback_select_manager_admin',
];

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();

  const tableResult = await client.query(`
    SELECT relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE oid = 'public.feedback'::regclass
  `);

  const columnsResult = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feedback'
    ORDER BY ordinal_position
  `);

  const policiesResult = await client.query(`
    SELECT policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feedback'
    ORDER BY cmd, policyname
  `);

  const constraintsResult = await client.query(`
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.feedback'::regclass
      AND conname IN (
        'feedback_rating_check',
        'feedback_nps_trigger_check',
        'feedback_entity_type_check'
      )
    ORDER BY conname
  `);

  const columnNames = new Set(columnsResult.rows.map((row) => row.column_name));
  const policyNames = new Set(policiesResult.rows.map((row) => row.policyname));
  const constraintNames = new Set(constraintsResult.rows.map((row) => row.conname));
  const errors = [];

  if (!tableResult.rows[0]?.relrowsecurity) errors.push('RLS non activee sur public.feedback');
  for (const column of requiredColumns) {
    if (!columnNames.has(column)) errors.push(`colonne manquante: ${column}`);
  }
  for (const policy of expectedPolicies) {
    if (!policyNames.has(policy)) errors.push(`policy manquante: ${policy}`);
  }
  for (const constraint of [
    'feedback_rating_check',
    'feedback_nps_trigger_check',
    'feedback_entity_type_check',
  ]) {
    if (!constraintNames.has(constraint)) errors.push(`contrainte manquante: ${constraint}`);
  }

  console.log(JSON.stringify({
    table: tableResult.rows[0] ?? null,
    columns: columnsResult.rows,
    policies: policiesResult.rows,
    constraints: constraintsResult.rows,
    errors,
  }, null, 2));

  if (errors.length > 0) process.exit(1);
} catch (err) {
  console.error('ERREUR:', err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
