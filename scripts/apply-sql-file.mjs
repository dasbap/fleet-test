#!/usr/bin/env node
/**
 * Applique un fichier SQL via DATABASE_URL (postgres).
 * Usage: node --env-file=.env.local scripts/apply-sql-file.mjs supabase/migrations/....sql
 */

import { readFileSync } from 'fs';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply-sql-file.mjs <fichier.sql>');
  process.exit(1);
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('ERREUR: DATABASE_URL manquant (.env.local)');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query(sql);
  console.log(`OK: ${file}`);
} catch (err) {
  console.error('ERREUR:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
