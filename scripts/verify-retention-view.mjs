/** Vérifie que PostgREST expose org_id sur v_retention_kpis. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const raw = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const lines = raw.split(/\r?\n/);
let serviceKey = "";
for (const l of lines) {
  if (l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
    serviceKey = l.slice("SUPABASE_SERVICE_ROLE_KEY=".length).trim();
  }
}
const urlLine = lines.find((l) => l.startsWith("VITE_SUPABASE_URL="));
const base = urlLine?.slice("VITE_SUPABASE_URL=".length).trim().replace(/\/$/, "");
if (!base || !serviceKey) process.exit(1);

const res = await fetch(`${base}/rest/v1/v_retention_kpis?select=org_id&limit=1`, {
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
});
const data = await res.json();
if (!res.ok) {
  console.error("Erreur:", res.status, data);
  process.exit(1);
}
const first = Array.isArray(data) ? data[0] : null;
if (first && "org_id" in first) {
  console.log("OK: colonne org_id présente sur v_retention_kpis");
  process.exit(0);
}
console.error("Réponse inattendue:", data);
process.exit(1);
