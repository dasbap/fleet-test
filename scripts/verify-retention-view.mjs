/** Verify that PostgREST exposes v_retention_kpis. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const raw = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const lines = raw.split(/\r?\n/);

let anonKey = "";
let serviceKey = "";
for (const line of lines) {
  if (line.startsWith("VITE_SUPABASE_ANON_KEY=")) {
    anonKey = line.slice("VITE_SUPABASE_ANON_KEY=".length).trim();
  }
  if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
    serviceKey = line.slice("SUPABASE_SERVICE_ROLE_KEY=".length).trim();
  }
}

const urlLine = lines.find((line) => line.startsWith("VITE_SUPABASE_URL="));
const base = urlLine?.slice("VITE_SUPABASE_URL=".length).trim().replace(/\/$/, "");
const apiKey = anonKey || serviceKey;

if (!base || !apiKey) {
  console.error("Missing VITE_SUPABASE_URL or Supabase API key.");
  process.exit(1);
}

const res = await fetch(`${base}/rest/v1/v_retention_kpis?select=org_id&limit=1`, {
  headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
});
const data = await res.json();

if (!res.ok) {
  console.error("Erreur:", res.status, data);
  process.exit(1);
}

const first = Array.isArray(data) ? data[0] : null;
if ((first && "org_id" in first) || (Array.isArray(data) && data.length === 0)) {
  console.log("OK: v_retention_kpis visible dans PostgREST");
  process.exit(0);
}

console.error("Reponse inattendue:", data);
process.exit(1);
