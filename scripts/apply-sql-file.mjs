#!/usr/bin/env node
/**
 * Applique un fichier SQL via DATABASE_URL (postgres).
 * Usage: node --env-file=.env.local scripts/apply-sql-file.mjs supabase/migrations/....sql [...]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';

export function resolveDatabaseUrl(env = process.env) {
  const direct = env.DATABASE_URL?.trim() || env.DIRECT_URL?.trim();
  if (direct) return direct;

  const dbUrl = env.SUPABASE_DB_URL?.trim();
  if (dbUrl) return dbUrl;

  const dbPassword = env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  if (dbPassword && supabaseUrl) {
    const ref = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
    if (ref) {
      return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
    }
  }

  return null;
}

export function buildPgClientConfig({ databaseUrl, env = process.env }) {
  let connectionString = databaseUrl;
  const sslMode = (() => {
    try {
      return new URL(databaseUrl).searchParams.get('sslmode')?.toLowerCase();
    } catch {
      return null;
    }
  })();
  const envSslMode = env.PGSSLMODE?.trim().toLowerCase();
  const allowSelfSigned =
    sslMode === 'no-verify' ||
    envSslMode === 'no-verify' ||
    env.SUPABASE_DB_SSL_NO_VERIFY === '1';

  if (allowSelfSigned) {
    try {
      const url = new URL(databaseUrl);
      url.searchParams.delete('sslmode');
      connectionString = url.toString();
    } catch {
      connectionString = databaseUrl;
    }
  }

  return {
    connectionString,
    ...(allowSelfSigned ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export async function applySqlFiles(files, env = process.env) {
  if (files.length === 0) {
    throw new Error('Usage: node scripts/apply-sql-file.mjs <fichier.sql> [...]');
  }

  const url = resolveDatabaseUrl(env);
  if (!url) {
    throw new Error(
      'connexion DB manquante. Ajoutez DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL',
    );
  }

  const client = new pg.Client(buildPgClientConfig({ databaseUrl: url, env }));

  try {
    await client.connect();
    for (const file of files) {
      const sql = readFileSync(file, 'utf8');
      await client.query(sql);
      console.log(`OK: ${file}`);
    }
  } finally {
    await client.end();
  }
}

async function runCli() {
  try {
    await applySqlFiles(process.argv.slice(2));
  } catch (err) {
    console.error('ERREUR:', err.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runCli();
}
