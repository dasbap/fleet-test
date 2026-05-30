/** Inspecte les colonnes des vues rétention via PostgREST / SQL RPC. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const raw = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const env = Object.fromEntries(
  raw.split(/\r?\n/).flatMap((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return [];
    const i = t.indexOf("=");
    if (i < 0) return [];
    return [[t.slice(0, i), t.slice(i + 1).trim()]];
  }),
);

const base = env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) {
  console.error("VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
  process.exit(1);
}

const views = [
  "v_retention_cohorts",
  "v_retention_kpis",
  "v_daily_active_users",
  "v_activation_funnel",
];

async function probeView(name) {
  const res = await fetch(`${base}/rest/v1/${name}?select=*&limit=0`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
    },
  });
  const errBody = await res.json().catch(() => ({}));
  return { name, status: res.status, ok: res.ok, body: errBody };
}

async function probeOrgId(name) {
  const res = await fetch(`${base}/rest/v1/${name}?select=org_id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  return { name, status: res.status, ok: res.ok, data };
}

console.log("=== Probe org_id sur chaque vue ===\n");
for (const v of views) {
  const r = await probeOrgId(v);
  if (r.ok) {
    console.log(`OK  ${v}: org_id accessible`);
  } else {
    const msg = r.data?.message ?? r.data?.hint ?? JSON.stringify(r.data);
    console.log(`ERR ${v} (${r.status}): ${msg}`);
  }
}

console.log("\n=== Colonnes attendues par le front ===");
const expected = {
  v_retention_kpis: ["org_id", "total_members", "retained_ever_d7"],
  v_retention_cohorts: ["org_id", "cohort_week", "cohort_size"],
  v_daily_active_users: ["org_id", "day", "dau"],
  v_activation_funnel: ["org_id", "role", "inscribed"],
};

for (const [view, cols] of Object.entries(expected)) {
  const select = cols.join(",");
  const res = await fetch(`${base}/rest/v1/${view}?select=${encodeURIComponent(select)}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`OK  ${view}: ${cols.join(", ")}`);
  } else {
    console.log(`ERR ${view}: ${data?.message ?? JSON.stringify(data)}`);
  }
}
