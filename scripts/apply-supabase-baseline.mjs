#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));

const baselineFile = path.join(
  root,
  "supabase",
  "baseline",
  "00000000000000_baseline_schema.sql",
);
const deltaListFile = path.join(root, "supabase", "baseline", "delta-migrations.txt");

function resolveDatabaseUrl() {
  const direct = process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim();
  if (direct) return direct;

  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (dbUrl) return dbUrl;

  const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  if (dbPassword && supabaseUrl) {
    const ref = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
    if (ref) {
      return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
    }
  }

  return null;
}

async function readDeltaFiles() {
  const content = await readFile(deltaListFile, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => path.join(root, line));
}

async function applySqlFile(client, file) {
  const relative = path.relative(root, file);
  const sql = await readFile(file, "utf8");
  console.log(`Application: ${relative}`);
  await client.query(sql);
  console.log(`OK: ${relative}`);
}

const dryRun = args.has("--dry-run");
const deltasOnly = args.has("--deltas-only");
const baselineOnly = args.has("--baseline-only");
const noReload = args.has("--no-reload");

if (deltasOnly && baselineOnly) {
  console.error("ERREUR: --deltas-only et --baseline-only sont incompatibles.");
  process.exit(1);
}

const files = [
  ...(deltasOnly ? [] : [baselineFile]),
  ...(baselineOnly ? [] : await readDeltaFiles()),
];

console.log("Setup Supabase baseline E-Samba");
console.log(
  deltasOnly
    ? "Mode: deltas uniquement"
    : baselineOnly
      ? "Mode: baseline uniquement"
      : "Mode: nouvelle base, baseline + deltas",
);

for (const file of files) {
  console.log(`- ${path.relative(root, file)}`);
}

if (dryRun) {
  console.log("Dry-run: aucune requete SQL executee.");
  process.exit(0);
}

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  console.error(
    [
      "ERREUR: connexion DB manquante dans .env.local.",
      "Ajoutez DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL, ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL.",
      "Si votre reseau bloque la connexion directe, copiez l'URI pooler Supabase complete dans DATABASE_URL.",
    ].join("\n"),
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();

  for (const file of files) {
    await applySqlFile(client, file);
  }

  if (!noReload) {
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("OK: cache PostgREST recharge.");
  }

  console.log("Setup Supabase termine.");
} catch (error) {
  if (error?.code === "42P07" && !deltasOnly) {
    console.error(
      [
        `ERREUR: ${error.message}`,
        "La baseline semble deja appliquee sur cette base.",
        "Relancez uniquement les deltas avec: npm run supabase:setup:deltas",
      ].join("\n"),
    );
  } else {
    console.error("ERREUR:", error.message);
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
