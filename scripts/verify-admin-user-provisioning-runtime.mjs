#!/usr/bin/env node
import { Client } from "pg";
import { buildPgClientConfig } from "./apply-sql-file.mjs";

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

const connectionString = resolveDatabaseUrl();

if (!connectionString) {
  console.error(
    "ERREUR: connexion DB manquante (.env.local). Ajoutez DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL",
  );
  process.exit(1);
}

const client = new Client(
  buildPgClientConfig({
    databaseUrl: connectionString,
    env: { ...process.env, SUPABASE_DB_SSL_NO_VERIFY: "1" },
  }),
);

const checks = [];

try {
  await client.connect();

  const table = await client.query(`
    select to_regclass('public.admin_profiles') as regclass
  `);
  checks.push({
    check: "admin_profiles_table",
    ok: table.rows[0]?.regclass === "admin_profiles",
  });

  const columns = await client.query(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_profiles'
      and column_name in ('user_id', 'is_active', 'created_at', 'created_by', 'notes')
  `);
  const columnNames = new Set(columns.rows.map((row) => row.column_name));
  checks.push({
    check: "admin_profiles_columns",
    ok: ["user_id", "is_active", "created_at", "created_by", "notes"].every((name) =>
      columnNames.has(name),
    ),
  });

  const fn = await client.query(`
    select exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'is_platform_admin'
        and pg_get_function_arguments(p.oid) = ''
    ) as ok
  `);
  checks.push({ check: "is_platform_admin_function", ok: fn.rows[0]?.ok === true });

  const grants = await client.query(`
    select grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'admin_profiles'
      and grantee = 'service_role'
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE')
  `);
  checks.push({
    check: "service_role_grants",
    ok: grants.rows.length >= 3,
  });

  const failed = checks.filter((check) => !check.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
} finally {
  await client.end().catch(() => {});
}
