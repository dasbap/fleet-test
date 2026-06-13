#!/usr/bin/env node
/** Sync variables Supabase minimales vers Vercel Production (esamba-web). */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "esamba-web");
const envPath = join(appDir, ".env.local");

function parseEnvFile(path) {
  if (!existsSync(path)) {
    console.error(`Fichier introuvable : ${path}`);
    process.exit(1);
  }
  const vars = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function addEnv(key, value, target) {
  console.log(`>> ${key} [${target}]`);
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", key, target, "--value", value, "--yes", "--force"],
    { cwd: appDir, stdio: "inherit", shell: true },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const vars = parseEnvFile(envPath);
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

for (const key of required) {
  if (!vars[key]?.trim()) {
    console.error(`Variable requise manquante : ${key}`);
    process.exit(1);
  }
  addEnv(key, vars[key].trim(), "production");
}

console.log(">> Variables Production synchronisées.");
