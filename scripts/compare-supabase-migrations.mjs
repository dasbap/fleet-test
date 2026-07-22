#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFiles = [".env.local", ".env.prod"];

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
  const direct = env.DATABASE_URL?.trim() || env.DIRECT_URL?.trim();
  if (direct) return direct;

  const dbUrl = env.SUPABASE_DB_URL?.trim();
  if (dbUrl) return dbUrl;

  const dbPassword = env.SUPABASE_DB_PASSWORD?.trim();
  const ref = resolveProjectRef(env);
  if (dbPassword && ref !== "unknown") {
    return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
  }

  return null;
}

function expectedMigrationVersions() {
  const migrationsDir = path.join(root, "supabase", "migrations");
  return readdirSync(migrationsDir)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort()
    .map((name) => ({
      file: `supabase/migrations/${name}`,
      version: name.split("_", 1)[0],
    }));
}

async function loadAppliedMigrations(file) {
  const env = loadEnvFile(file);
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  let rpcError = null;

  if (supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.rpc("liste_migrations_appliquees");
    if (!error && Array.isArray(data)) {
      return {
        file,
        ref: resolveProjectRef(env),
        source: "RPC",
        versions: data.map((version) => String(version)).sort(),
      };
    }
    rpcError = error?.message ?? "format RPC inattendu";
  }

  const databaseUrl = resolveDatabaseUrl(env);
  if (!databaseUrl) {
    throw new Error(
      `${file}: VITE_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ou URL DB manquants` +
        (rpcError ? ` (RPC: ${rpcError})` : ""),
    );
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const exists = await client.query(
      "select to_regclass('supabase_migrations.schema_migrations') as table_name",
    );
    if (!exists.rows[0]?.table_name) {
      return {
        file,
        ref: resolveProjectRef(env),
        source: rpcError
          ? `SQL direct (historique migrations absent, RPC KO: ${rpcError})`
          : "SQL direct (historique migrations absent)",
        versions: [],
        historyMissing: true,
      };
    }

    const result = await client.query(
      "select version from supabase_migrations.schema_migrations order by version",
    );
    return {
      file,
      ref: resolveProjectRef(env),
      source: rpcError ? `SQL direct (RPC KO: ${rpcError})` : "SQL direct",
      versions: result.rows.map((row) => String(row.version)),
    };
  } finally {
    await client.end();
  }
}

function diffVersions(left, right) {
  const rightSet = new Set(right);
  return left.filter((version) => !rightSet.has(version));
}

function printList(title, versions, byVersion) {
  console.log(title);
  if (versions.length === 0) {
    console.log("  - aucune");
    return;
  }
  for (const version of versions) {
    console.log(`  - ${byVersion.get(version)?.file ?? version}`);
  }
}

const expected = expectedMigrationVersions();
const expectedVersions = expected.map((migration) => migration.version);
const byVersion = new Map(expected.map((migration) => [migration.version, migration]));

const [local, prod] = await Promise.all(envFiles.map(loadAppliedMigrations));

console.log("Comparaison migrations Supabase");
console.log(
  `- ${local.file}: ${local.ref}, ${local.versions.length} migration(s) enregistree(s), source ${local.source}`,
);
console.log(
  `- ${prod.file}: ${prod.ref}, ${prod.versions.length} migration(s) enregistree(s), source ${prod.source}`,
);
console.log(`- repo: ${expectedVersions.length} fichier(s) dans supabase/migrations`);

const missingOnLocalFromProd = diffVersions(prod.versions, local.versions);
const missingOnProdFromLocal = diffVersions(local.versions, prod.versions);
const missingLocalRepoFiles = diffVersions(local.versions, expectedVersions);
const missingProdRepoFiles = diffVersions(prod.versions, expectedVersions);
const repoNotRecordedLocal = diffVersions(expectedVersions, local.versions);
const repoNotRecordedProd = diffVersions(expectedVersions, prod.versions);
const localExtraSet = new Set(missingLocalRepoFiles);
const prodExtraSet = new Set(missingProdRepoFiles);
const asymmetricLocalExtras = missingLocalRepoFiles.filter((version) => !prodExtraSet.has(version));
const asymmetricProdExtras = missingProdRepoFiles.filter((version) => !localExtraSet.has(version));

printList("Manquantes sur .env.local mais presentes sur .env.prod:", missingOnLocalFromProd, byVersion);
printList("Manquantes sur .env.prod mais presentes sur .env.local:", missingOnProdFromLocal, byVersion);
printList("En repo mais non enregistrees sur .env.local:", repoNotRecordedLocal, byVersion);
printList("En repo mais non enregistrees sur .env.prod:", repoNotRecordedProd, byVersion);
printList("Enregistrees sur .env.local mais fichier absent du repo:", missingLocalRepoFiles, byVersion);
printList("Enregistrees sur .env.prod mais fichier absent du repo:", missingProdRepoFiles, byVersion);

if (
  missingOnLocalFromProd.length ||
  missingOnProdFromLocal.length ||
  repoNotRecordedLocal.length ||
  repoNotRecordedProd.length ||
  asymmetricLocalExtras.length ||
  asymmetricProdExtras.length
) {
  process.exitCode = 1;
}
