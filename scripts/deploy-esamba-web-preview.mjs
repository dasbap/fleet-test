#!/usr/bin/env node
/**
 * Déploie apps/esamba-web en preview Vercel (sans toucher www.e-samba.com).
 * Lit apps/esamba-web/.env.local pour Supabase + paiements.
 * N'injecte pas NEXT_PUBLIC_APP_URL : l'URL preview est déduite via VERCEL_URL.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "apps", "esamba-web");
const envPath = join(appDir, ".env.local");

const BUILD_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NOTCH_PAY_API_KEY",
  "NOTCHPAY_SECRET_KEY",
  "FAPSHI_API_USER",
  "FAPSHI_API_KEY",
  "FAPSHI_API_URL",
];

function parseEnvFile(path) {
  if (!existsSync(path)) {
    console.error(`Fichier introuvable : ${path}`);
    console.error("Copiez apps/esamba-web/.env.example vers .env.local et renseignez Supabase.");
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

function main() {
  const vars = parseEnvFile(envPath);

  if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis.");
    process.exit(1);
  }

  const args = ["deploy", "--yes", "--target", "preview"];
  for (const key of BUILD_ENV_KEYS) {
    const value = vars[key]?.trim();
    if (value) {
      args.push("-b", `${key}=${value}`);
    }
  }

  console.log(">> Preview Vercel — atipik/esamba-web (sans --prod)");
  console.log(">> NEXT_PUBLIC_APP_URL non fixé — URL preview via VERCEL_URL");

  const result = spawnSync("npx", ["vercel", ...args], {
    cwd: appDir,
    stdio: "inherit",
    shell: true,
  });

  process.exit(result.status ?? 1);
}

main();
