/**
 * Appel de test POST vers l'Edge Function onboarding-sequence (cron).
 * Lit VITE_SUPABASE_URL ou SUPABASE_URL et CRON_SECRET depuis .env.local — ne journalise jamais le secret.
 * Usage : node scripts/invoke-onboarding-sequence-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = parseEnvFile(envPath);
const refFromProcess = process.env.SUPABASE_PROJECT_REF?.trim();
const baseFromRef = refFromProcess
  ? `https://${refFromProcess}.supabase.co`
  : "";
const base = (
  env.VITE_SUPABASE_URL ||
  env.SUPABASE_URL ||
  baseFromRef ||
  ""
).replace(/\/$/, "");
const secret = env.CRON_SECRET;

if (!base || !secret) {
  console.error(
    "Configurer : CRON_SECRET dans .env.local, et l’URL du projet via l’une des options :",
  );
  console.error(
    "  - VITE_SUPABASE_URL ou SUPABASE_URL dans .env.local, ou",
  );
  console.error(
    "  - variable d’environnement SUPABASE_PROJECT_REF (ex. ref du projet lié, voir npx supabase projects list).",
  );
  console.error(
    "Côté cloud : npx supabase secrets set CRON_SECRET=<secret> (le même que dans .env.local pour les tests).",
  );
  process.exit(2);
}

const url = `${base}/functions/v1/onboarding-sequence`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});

const text = await res.text();
console.log("HTTP", res.status);
console.log(text);
