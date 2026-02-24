/**
 * Vérifie que RLS est activé sur public.incidents.
 * Utilisation : node scripts/verify-rls-incidents.js
 * Connexion : DATABASE_URL ou défaut local postgresql://postgres:postgres@127.0.0.1:54322/postgres
 */
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const query = `
  SELECT relname AS table_name, relrowsecurity AS rls_enabled
  FROM pg_class
  WHERE relname = 'incidents'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
`;

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query(query);
    if (res.rows.length === 0) {
      console.log('Aucune ligne : table public.incidents introuvable.');
      process.exit(1);
    }
    const row = res.rows[0];
    const ok = row.rls_enabled === true;
    console.log('Table:', row.table_name, '| RLS activé:', row.rls_enabled);
    if (!ok) {
      console.log('Échec : relrowsecurity doit être true.');
      process.exit(1);
    }
    console.log('Vérification OK.');
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
