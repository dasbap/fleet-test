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

const expected = [
  "v_activation_funnel",
  "v_daily_active_users",
  "v_retention_cohorts",
  "v_retention_kpis",
];

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const result = await client.query(
    `
      SELECT
        c.relname,
        c.relkind,
        array_agg(a.attname ORDER BY a.attnum)
          FILTER (WHERE a.attnum > 0 AND NOT a.attisdropped) AS columns
      FROM pg_class c
      INNER JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1::text[])
      GROUP BY c.relname, c.relkind
      ORDER BY c.relname;
    `,
    [expected],
  );

  const found = new Set(result.rows.map((row) => row.relname));
  const missing = expected.filter((name) => !found.has(name));

  console.log(JSON.stringify({ views: result.rows, missing }, null, 2));
  if (missing.length > 0) process.exit(1);
} finally {
  await client.end().catch(() => {});
}
