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
  'vehicle_id',
  'driver_user_id',
  'severity',
  'description',
  'incident_category',
  'evidence_path',
  'latitude',
  'longitude',
  'status',
  'resolved_at',
  'resolved_by',
  'client_idempotency_key',
  'created_at',
];

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();

  const { rows } = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'incidents'
    ORDER BY ordinal_position
  `);

  const existing = new Set(rows.map((row) => row.column_name));
  const missing = requiredColumns.filter((column) => !existing.has(column));

  console.log(JSON.stringify({ table: 'public.incidents', missing, columns: rows }, null, 2));
} catch (err) {
  console.error('ERREUR:', err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
