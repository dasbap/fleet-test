#!/usr/bin/env node
import { Client } from "pg";

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

const client = new Client({ connectionString });
const checks = [];

async function exists(name, sql) {
  const result = await client.query(sql);
  checks.push({ check: name, ok: result.rows[0]?.ok === true });
}

try {
  await client.connect();

  await exists(
    "demo_profiles_columns",
    `
      select count(*) = 8 as ok
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'demo_profiles'
        and column_name in (
          'user_id',
          'email',
          'account_type',
          'demo_role',
          'fleet_id',
          'is_active',
          'expires_at',
          'deactivated_at'
        )
    `,
  );

  await exists(
    "admin_profiles_table",
    `select to_regclass('public.admin_profiles') is not null as ok`,
  );

  await exists(
    "flottes_is_demo_column",
    `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'flottes'
          and column_name = 'is_demo'
          and data_type = 'boolean'
      ) as ok
    `,
  );

  await exists(
    "demo_fleets_queryable",
    `
      select exists (
        select 1
        from public.flottes
        where is_demo = true
      ) as ok
    `,
  );

  await exists(
    "flottes_platform_admin_policy",
    `
      select exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'flottes'
          and policyname = 'flottes_select_platform_admin'
          and qual like '%is_platform_admin%'
      ) as ok
    `,
  );

  await exists(
    "platform_admin_rpc",
    `
      select exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'is_platform_admin'
          and pg_get_function_arguments(p.oid) = ''
      ) as ok
    `,
  );

  await exists(
    "prospect_create_account_supports_account_type",
    `
      select exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'prospect_create_account'
          and pg_get_function_arguments(p.oid) like '%p_account_type text%'
      ) as ok
    `,
  );

  await exists(
    "demo_admin_rpcs",
    `
      select count(distinct p.proname) = 5 as ok
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'admin_list_demo_sessions',
          'demo_create_magic_link',
          'demo_validate_magic_link',
          'expire_demo_accounts_by_type',
          'reactivate_demo_account'
        )
    `,
  );

  await exists(
    "demo_session_rpc",
    `
      select exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'demo_upsert_session'
          and pg_get_function_arguments(p.oid) like '%p_ip_address text%'
          and pg_get_function_arguments(p.oid) like '%p_user_agent text%'
      ) as ok
    `,
  );

  await exists(
    "active_demo_accounts_have_expiration",
    `
      select not exists (
        select 1
        from public.demo_profiles
        where is_active = true
          and expires_at is null
      ) as ok
    `,
  );

  const failed = checks.filter((check) => !check.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
} finally {
  await client.end().catch(() => {});
}
