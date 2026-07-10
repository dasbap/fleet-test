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
  'user_id',
  'token',
  'platform',
  'device_info',
  'created_at',
  'updated_at',
  'last_seen_at',
];

const expectedPolicies = [
  'notification_tokens_select_own',
  'notification_tokens_insert_own',
  'notification_tokens_update_own',
];

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();

  const tableResult = await client.query(`
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.notification_tokens'::regclass
  `);

  const columnsResult = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_tokens'
    ORDER BY ordinal_position
  `);

  const policiesResult = await client.query(`
    SELECT policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_tokens'
    ORDER BY cmd, policyname
  `);

  const indexesResult = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'notification_tokens'
      AND indexname IN ('notification_tokens_token_key', 'notification_tokens_user_id_idx')
    ORDER BY indexname
  `);

  const grantsResult = await client.query(`
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'notification_tokens'
      AND grantee IN ('authenticated', 'service_role')
    ORDER BY grantee, privilege_type
  `);

  const columnNames = new Set(columnsResult.rows.map((row) => row.column_name));
  const policyNames = new Set(policiesResult.rows.map((row) => row.policyname));
  const indexNames = new Set(indexesResult.rows.map((row) => row.indexname));
  const grants = new Set(grantsResult.rows.map((row) => `${row.grantee}:${row.privilege_type}`));
  const errors = [];

  if (!tableResult.rows[0]?.relrowsecurity) errors.push('RLS non activee sur public.notification_tokens');
  for (const column of requiredColumns) {
    if (!columnNames.has(column)) errors.push(`colonne manquante: ${column}`);
  }
  for (const policy of expectedPolicies) {
    if (!policyNames.has(policy)) errors.push(`policy manquante: ${policy}`);
  }
  for (const index of ['notification_tokens_token_key', 'notification_tokens_user_id_idx']) {
    if (!indexNames.has(index)) errors.push(`index manquant: ${index}`);
  }
  for (const privilege of ['authenticated:SELECT', 'authenticated:INSERT', 'authenticated:UPDATE']) {
    if (!grants.has(privilege)) errors.push(`grant manquant: ${privilege}`);
  }

  console.log(JSON.stringify({
    table: tableResult.rows[0] ?? null,
    columns: columnsResult.rows,
    policies: policiesResult.rows,
    indexes: indexesResult.rows,
    grants: grantsResult.rows,
    errors,
  }, null, 2));

  if (errors.length > 0) process.exit(1);
} catch (err) {
  console.error('ERREUR:', err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
