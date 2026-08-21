import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const fleetId = process.env.FLEET_ID?.trim() || "";

if (!url || !serviceRoleKey || !fleetId) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et FLEET_ID sont requis.");
}

const sb = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: flotte, error: fErr } = await sb
  .from("flottes")
  .select("id, name, org_id, created_at")
  .eq("id", fleetId)
  .maybeSingle();

console.log("\n=== FLOTTE ===");
if (fErr) console.error("ERREUR:", fErr.message);
else if (!flotte) console.log("Flotte introuvable");
else console.log("Trouvée:", JSON.stringify(flotte, null, 2));

const { data: kpis, error: kErr } = await sb
  .from("v_retention_kpis")
  .select("org_id, total_members, never_activated")
  .limit(3);

console.log("\n=== v_retention_kpis ===");
if (kErr) console.error("ERREUR SQL:", kErr.message);
else console.log("Vue OK, lignes:", kpis?.length ?? 0);

const { data: health, error: hErr } = await sb
  .rpc("fleet_driver_activation_health", { p_fleet_id: fleetId });

console.log("\n=== fleet_driver_activation_health ===");
if (hErr) console.error("ERREUR RPC:", hErr.message);
else console.log("RPC OK:", JSON.stringify(health, null, 2));
