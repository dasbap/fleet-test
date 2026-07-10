#!/usr/bin/env node

import pg from "pg";

function resolveDatabaseUrl() {
  const direct =
    process.env.DATABASE_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim();
  if (direct) return direct;

  const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  if (dbPassword && supabaseUrl) {
    const ref = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
    if (ref) {
      return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
    }
  }

  return null;
}

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  console.error("ERREUR: DATABASE_URL, DIRECT_URL ou SUPABASE_DB_URL manquant.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();

  const functions = await client.query(`
    select
      to_regprocedure('public.is_help_center_admin()') as admin_fn,
      to_regprocedure('public.get_help_analytics_summary(integer)') as analytics_fn,
      to_regprocedure('public.search_users(text, integer)') as old_search_fn
  `);

  const indexes = await client.query(`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'idx_alertes_message_trgm',
        'idx_alertes_automatiques_message_trgm',
        'idx_travaux_notes_trgm',
        'idx_travaux_maintenance_notes_trgm'
      )
    order by indexname
  `);

  console.log(JSON.stringify({
    functions: functions.rows[0],
    indexes: indexes.rows.map((row) => row.indexname),
  }, null, 2));
} finally {
  await client.end().catch(() => {});
}
