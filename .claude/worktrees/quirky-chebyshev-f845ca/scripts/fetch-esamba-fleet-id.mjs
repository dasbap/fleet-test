/**
 * Récupère l'UUID de la flotte « Flotte ESAMBA » via REST (service role dans .env.local).
 * Usage : node scripts/fetch-esamba-fleet-id.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");
const raw = fs.readFileSync(envPath, "utf8");
const lines = raw.split(/\r?\n/);

function getValue(key) {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  if (!line) return "";
  return line.slice(key.length + 1).trim();
}

let serviceKey = "";
for (const l of lines) {
  if (l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
    serviceKey = l.slice("SUPABASE_SERVICE_ROLE_KEY=".length).trim();
  }
}

const url = getValue("VITE_SUPABASE_URL").replace(/\/$/, "");
if (!url || !serviceKey) {
  console.error("VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  process.exit(1);
}

const filter = encodeURIComponent("Flotte ESAMBA");
const res = await fetch(
  `${url}/rest/v1/flottes?select=id,name&name=eq.${filter}`,
  {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  },
);

const data = await res.json();
if (!res.ok) {
  console.error("Erreur API:", res.status, data);
  process.exit(1);
}
if (!Array.isArray(data) || data.length === 0) {
  console.error("Aucune flotte nommée « Flotte ESAMBA » trouvée.");
  process.exit(1);
}
console.log(data[0].id);
