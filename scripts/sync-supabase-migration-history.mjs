#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const envFileArg = process.argv.find((arg) => arg.startsWith("--env="));
const envFile = envFileArg?.slice("--env=".length);
const mirrorFromArg = process.argv.find((arg) => arg.startsWith("--mirror-from="));
const mirrorFromEnvFile = mirrorFromArg?.slice("--mirror-from=".length);
const apply = args.has("--apply");
const recordOnly = args.has("--record-only");
const runtimeLocalSync = args.has("--runtime-local-sync");

const runtimeLocalSyncFiles = [
  "supabase/migrations/20260226100000_liste_migrations_appliquees_rpc.sql",
  "supabase/migrations/20260630160000_bootstrap_onboarding_for_baseline.sql",
  "supabase/migrations/20260630170000_bootstrap_billing_context_for_baseline.sql",
  "supabase/migrations/20260630180000_bootstrap_prod_alerts_documents.sql",
  "supabase/migrations/20260701120000_dashboard_snapshot_baseline_compat.sql",
  "supabase/migrations/20260701130000_fleet_validation_views.sql",
  "supabase/migrations/20260702000000_harden_help_center_admin_rls.sql",
  "supabase/migrations/20260702001000_remove_duplicate_runtime_objects.sql",
  "supabase/migrations/20260702002000_restore_rbac_check_permission.sql",
  "supabase/migrations/20260702003000_restore_get_fleet_members.sql",
  "supabase/migrations/20260702004000_restore_maintenance_planning_columns.sql",
  "supabase/migrations/20260702005000_restore_top_driver_scores_rpc.sql",
  "supabase/migrations/20260702006000_restore_planning_creneaux.sql",
  "supabase/migrations/20260702007000_restore_retention_analytics_views.sql",
  "supabase/migrations/20260702008000_restore_driver_licenses.sql",
  "supabase/migrations/20260702009000_restore_scheduled_reports.sql",
  "supabase/migrations/20260702010000_restore_geofencing_runtime.sql",
  "supabase/migrations/20260702011000_restore_unassign_vehicle_driver_rpc.sql",
  "supabase/migrations/20260702012000_fix_search_users_rpc_ordering.sql",
  "supabase/migrations/20260703120000_prod_maintenance_rls_fleet_roles.sql",
  "supabase/migrations/20260703121000_restore_verifier_recette_maintenance_rpc.sql",
  "supabase/migrations/20260703122000_restore_maintenance_evidence_storage.sql",
  "supabase/migrations/20260703123000_restore_maintenance_evidence_rls.sql",
  "supabase/migrations/20260703124000_restore_feedback_runtime.sql",
  "supabase/migrations/20260703125000_restore_fleet_audit_runtime.sql",
  "supabase/migrations/20260706102000_restore_notification_tokens_runtime.sql",
  "supabase/migrations/20260706123000_restore_admin_user_provisioning_runtime.sql",
  "supabase/migrations/20260708120000_repair_dvir_controles_journaliers_shape.sql",
  "supabase/migrations/20260709100000_restore_starter_billing_plan.sql",
  "supabase/migrations/20260709110000_drop_legacy_fermer_creneau_overload.sql",
  "supabase/migrations/20260710100000_restore_service_role_test_seed_grants.sql",
  "supabase/migrations/20260710110000_restore_membership_and_billing_rpc_contracts.sql",
];

if (!envFile || ![".env.local", ".env.prod"].includes(envFile)) {
  console.error(
    "Usage: node scripts/sync-supabase-migration-history.mjs --env=.env.local|.env.prod [--apply] [--record-only] [--mirror-from=.env.local|.env.prod] [--runtime-local-sync]",
  );
  process.exit(1);
}

if (mirrorFromEnvFile && ![".env.local", ".env.prod"].includes(mirrorFromEnvFile)) {
  console.error("--mirror-from doit valoir .env.local ou .env.prod");
  process.exit(1);
}

function loadEnvFile(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    throw new Error(`${file} introuvable`);
  }

  const values = {};
  for (const rawLine of readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

function resolveProjectRef(env) {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const fromUrl = supabaseUrl?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  if (fromUrl) return fromUrl;

  const directUrl = env.DATABASE_URL || env.DIRECT_URL || env.SUPABASE_DB_URL;
  return directUrl?.match(/(?:db|pooler)\.([a-z0-9]+)\.supabase\.co/)?.[1] ?? "unknown";
}

function resolveDatabaseUrl(env) {
  const dbPassword = env.SUPABASE_DB_PASSWORD?.trim();
  const ref = resolveProjectRef(env);
  if (dbPassword && ref !== "unknown") {
    return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
  }

  const direct = env.DATABASE_URL?.trim() || env.DIRECT_URL?.trim();
  if (direct) return direct;

  const dbUrl = env.SUPABASE_DB_URL?.trim();
  if (dbUrl) return dbUrl;

  return null;
}

function migrationFiles() {
  const migrationsDir = path.join(root, "supabase", "migrations");
  return readdirSync(migrationsDir)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort()
    .map((name) => ({
      path: path.join(migrationsDir, name),
      relativePath: `supabase/migrations/${name}`,
      version: name.split("_", 1)[0],
      name: name.replace(/^\d+_/, "").replace(/\.sql$/, ""),
    }));
}

function runtimeLocalMigrations() {
  return runtimeLocalSyncFiles.map((relativePath) => {
    const name = path.basename(relativePath);
    return {
      path: path.join(root, relativePath),
      relativePath,
      version: name.split("_", 1)[0],
      name: name.replace(/^\d+_/, "").replace(/\.sql$/, ""),
    };
  });
}

async function assertNoDataDelete(client, sql, file) {
  if (
    file === "supabase/migrations/20260630160000_bootstrap_onboarding_for_baseline.sql" &&
    /\bdelete\s+from\b/i.test(sql)
  ) {
    const exists = await client.query("select to_regclass('public.onboarding_progress') as table_name");
    if (!exists.rows[0]?.table_name) return;

    const duplicateRows = await client.query(`
      with ranked as (
        select
          id,
          row_number() over (
            partition by org_id
            order by updated_at desc nulls last, created_at desc nulls last, id desc
          ) as rn
        from public.onboarding_progress
      )
      select count(*)::int as count
      from ranked
      where rn > 1
    `);

    if (duplicateRows.rows[0]?.count === 0) {
      console.log(`${file}: DELETE onboarding autorise, 0 ligne concernee.`);
      return;
    }

    throw new Error(
      `${file}: operation bloquee, ${duplicateRows.rows[0]?.count} ligne(s) seraient supprimees`,
    );
  }

  const forbidden = [
    /\btruncate\b/i,
    /\bdelete\s+from\b/i,
    /\bdrop\s+schema\b/i,
    /\bdrop\s+table\b/i,
  ];
  const hit = forbidden.find((pattern) => pattern.test(sql));
  if (hit) {
    throw new Error(`${file}: operation bloquee par garde anti-destruction (${hit})`);
  }
}

async function ensureMigrationHistory(client) {
  await client.query("create schema if not exists supabase_migrations");
  await client.query(`
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    )
  `);
}

async function appliedVersions(client) {
  const exists = await client.query(
    "select to_regclass('supabase_migrations.schema_migrations') as table_name",
  );
  if (!exists.rows[0]?.table_name) return new Set();

  const result = await client.query(
    "select version from supabase_migrations.schema_migrations order by version",
  );
  return new Set(result.rows.map((row) => String(row.version)));
}

async function historyRows(client) {
  const exists = await client.query(
    "select to_regclass('supabase_migrations.schema_migrations') as table_name",
  );
  if (!exists.rows[0]?.table_name) return [];

  const columns = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'supabase_migrations'
        and table_name = 'schema_migrations'
    `,
  );
  const names = new Set(columns.rows.map((row) => row.column_name));
  const selectName = names.has("name") ? "name" : "null::text as name";
  const selectStatements = names.has("statements") ? "statements" : "array[]::text[] as statements";

  const result = await client.query(
    `select version::text, ${selectName}, ${selectStatements} from supabase_migrations.schema_migrations order by version`,
  );
  return result.rows;
}

async function recordMigration(client, migration) {
  await client.query(
    `
      insert into supabase_migrations.schema_migrations(version, name, statements)
      values ($1, $2, $3)
      on conflict (version) do update
      set name = coalesce(supabase_migrations.schema_migrations.name, excluded.name)
    `,
    [migration.version, migration.name, []],
  );
}

async function connectEnv(file) {
  const env = loadEnvFile(file);
  const databaseUrl = resolveDatabaseUrl(env);
  if (!databaseUrl) {
    throw new Error(`${file}: connexion DB manquante`);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return { env, client };
}

const env = loadEnvFile(envFile);
const databaseUrl = resolveDatabaseUrl(env);
if (!databaseUrl) {
  throw new Error(`${envFile}: connexion DB manquante`);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  if (mirrorFromEnvFile) {
    if (!apply) {
      console.log(`Dry-run miroir: ${mirrorFromEnvFile} -> ${envFile}`);
    }

    const source = await connectEnv(mirrorFromEnvFile);
    try {
      const sourceRows = await historyRows(source.client);
      const targetApplied = await appliedVersions(client);
      const missingRows = sourceRows.filter((row) => !targetApplied.has(String(row.version)));

      console.log(`Miroir historique: ${mirrorFromEnvFile} -> ${envFile}`);
      console.log(`Source ${resolveProjectRef(source.env)}: ${sourceRows.length} migration(s)`);
      console.log(`Cible ${resolveProjectRef(env)}: ${targetApplied.size} migration(s)`);
      console.log(`A enregistrer: ${missingRows.length}`);
      for (const row of missingRows) {
        console.log(`- ${row.version}${row.name ? `_${row.name}` : ""}`);
      }

      if (!apply) {
        console.log("Dry-run: aucune ecriture effectuee. Relancer avec --apply pour synchroniser.");
        process.exit(0);
      }

      await ensureMigrationHistory(client);
      for (const row of missingRows) {
        await client.query(
          `
            insert into supabase_migrations.schema_migrations(version, name, statements)
            values ($1, $2, $3)
            on conflict (version) do nothing
          `,
          [String(row.version), row.name ?? null, row.statements ?? []],
        );
      }

      const appliedAfterMirror = await appliedVersions(client);
      console.log(`Migrations enregistrees apres miroir: ${appliedAfterMirror.size}`);
      process.exit(0);
    } finally {
      await source.client.end();
    }
  }

  const migrations = runtimeLocalSync ? runtimeLocalMigrations() : migrationFiles();
  const appliedBefore = await appliedVersions(client);
  const missing = runtimeLocalSync
    ? migrations
    : migrations.filter((migration) => !appliedBefore.has(migration.version));

  console.log(`Projet: ${resolveProjectRef(env)} (${envFile})`);
  console.log(runtimeLocalSync ? "Mode: runtime local force" : `Migrations repo: ${migrations.length}`);
  console.log(`Migrations enregistrees: ${appliedBefore.size}`);
  console.log(
    runtimeLocalSync
      ? `Migrations ciblees a rejouer: ${missing.length}`
      : `Migrations manquantes dans l'historique: ${missing.length}`,
  );

  for (const migration of missing) {
    console.log(`- ${migration.relativePath}`);
  }

  if (!apply) {
    console.log("Dry-run: aucune ecriture effectuee. Relancer avec --apply pour synchroniser.");
    process.exit(0);
  }

  await ensureMigrationHistory(client);

  for (const migration of missing) {
    const sql = readFileSync(migration.path, "utf8");
    await assertNoDataDelete(client, sql, migration.relativePath);
    if (!recordOnly) {
      console.log(`Application: ${migration.relativePath}`);
      await client.query(sql);
    } else {
      console.log(`Historique seul: ${migration.relativePath}`);
    }
    await recordMigration(client, migration);
  }

  await client.query("NOTIFY pgrst, 'reload schema';");

  const appliedAfter = await appliedVersions(client);
  const stillMissing = migrations.filter((migration) => !appliedAfter.has(migration.version));
  console.log(`Migrations enregistrees apres sync: ${appliedAfter.size}`);
  console.log(`Encore manquantes: ${stillMissing.length}`);
  if (stillMissing.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
