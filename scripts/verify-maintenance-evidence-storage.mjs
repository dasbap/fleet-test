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
  'maintenance_evidence_select_fleet',
  'maintenance_evidence_insert_fleet',
  'maintenance_evidence_delete_fleet',
];

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();

  const bucketResult = await client.query(`
    SELECT id, name, public, file_size_limit, allowed_mime_types
    FROM storage.buckets
    WHERE id = 'maintenance-evidence'
  `);

  const policiesResult = await client.query(`
    SELECT policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname LIKE 'maintenance_evidence_%'
    ORDER BY policyname
  `);

  const bucket = bucketResult.rows[0] ?? null;
  const existingPolicies = new Set(policiesResult.rows.map((row) => row.policyname));
  const errors = [];

  if (!bucket) {
    errors.push('bucket maintenance-evidence absent');
  } else {
    const allowedMimeTypes = bucket.allowed_mime_types ?? [];
    if (bucket.public !== false) errors.push('bucket doit etre prive');
    if (Number(bucket.file_size_limit) !== 5242880) errors.push('file_size_limit attendu: 5242880');
    for (const mime of ['image/jpeg', 'image/png', 'image/webp']) {
      if (!allowedMimeTypes.includes(mime)) errors.push(`mime type manquant: ${mime}`);
    }
  }

  for (const policy of expectedPolicies) {
    if (!existingPolicies.has(policy)) errors.push(`policy manquante: ${policy}`);
  }

  console.log(JSON.stringify({
    bucket,
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
