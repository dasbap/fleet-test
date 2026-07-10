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

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();

  const table = await client.query(`
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.audit_logs'::regclass
  `);

  const columns = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name IN ('id', 'actor_id', 'action', 'target_id', 'fleet_id', 'metadata', 'created_at')
    ORDER BY column_name
  `);

  const policies = await client.query(`
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'audit_logs_select_fleet_roles'
  `);

  const functions = await client.query(`
    SELECT
      p.oid::regprocedure::text AS signature,
      p.prosecdef AS security_definer,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_fleet_audit_logs', 'write_audit_log')
    ORDER BY signature
  `);

  const functionBySignature = new Map(functions.rows.map((row) => [row.signature, row]));
  const errors = [];

  if (!table.rows[0]?.relrowsecurity) errors.push('RLS non activee sur public.audit_logs');
  if (columns.rows.length !== 7) errors.push('colonnes audit_logs attendues incompletes');
  if (policies.rows.length !== 1) errors.push('policy audit_logs_select_fleet_roles absente');

  for (const signature of [
    'get_fleet_audit_logs(uuid,integer,text[])',
    'write_audit_log(text,uuid,uuid,jsonb,uuid)',
  ]) {
    const row = functionBySignature.get(signature);
    if (!row) {
      errors.push(`fonction absente: public.${signature}`);
      continue;
    }
    if (!row.security_definer) errors.push(`SECURITY DEFINER absent: ${signature}`);
    if (!row.authenticated_can_execute) errors.push(`grant EXECUTE authenticated absent: ${signature}`);
    if (row.anon_can_execute) errors.push(`grant EXECUTE anon actif: ${signature}`);
  }

  console.log(JSON.stringify({
    table: table.rows[0] ?? null,
    columns: columns.rows,
    policies: policies.rows,
    functions: functions.rows,
    errors,
  }, null, 2));

  if (errors.length > 0) process.exit(1);
} catch (err) {
  console.error('ERREUR:', err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
