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

  const { rows } = await client.query(`
    SELECT
      p.oid::regprocedure::text AS signature,
      pg_get_function_result(p.oid) AS result_type,
      p.prosecdef AS security_definer,
      p.proconfig AS config,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'verifier_recette_maintenance'
      AND p.proargtypes = '2950'::oidvector
  `);

  const rpc = rows[0];
  const errors = [];

  if (!rpc) {
    errors.push('fonction public.verifier_recette_maintenance(uuid) absente');
  } else {
    const config = Array.isArray(rpc.config) ? rpc.config : [];
    if (!rpc.security_definer) errors.push('SECURITY DEFINER absent');
    if (!config.includes('search_path=public')) errors.push('search_path public absent');
    if (!rpc.authenticated_can_execute) errors.push('grant EXECUTE authenticated absent');
    if (rpc.anon_can_execute) errors.push('grant EXECUTE anon ne devrait pas etre actif');
    if (!rpc.result_type.includes('peut_cloturer boolean')) {
      errors.push('colonne retour peut_cloturer boolean absente');
    }
    if (!rpc.result_type.includes('message_blocage text')) {
      errors.push('colonne retour message_blocage text absente');
    }
  }

  console.log(JSON.stringify({ function: rpc ?? null, errors }, null, 2));

  if (errors.length > 0) {
    process.exit(1);
  }
} catch (err) {
  console.error('ERREUR:', err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
