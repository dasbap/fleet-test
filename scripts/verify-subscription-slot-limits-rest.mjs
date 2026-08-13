import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("ERREUR: VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const ACTIVE_STATUSES = new Set(["trial", "active"]);

const { data: plans, error: planError } = await supabase
  .from("plans")
  .select("id, code, max_vehicles, max_vehicles_per_subscription");
if (planError) throw new Error(planError.message);

const planById = new Map((plans ?? []).map((plan) => [plan.id, plan]));

const { data: subscriptions, error: subscriptionError } = await supabase
  .from("abonnements")
  .select("id, fleet_id, plan_id, status, vehicle_slots");
if (subscriptionError) throw new Error(subscriptionError.message);

const groups = new Map();

for (const subscription of subscriptions ?? []) {
  if (!ACTIVE_STATUSES.has(subscription.status)) continue;

  const plan = planById.get(subscription.plan_id);
  if (!plan || plan.max_vehicles === null || plan.max_vehicles === undefined) continue;

  const key = `${subscription.fleet_id}:${subscription.plan_id}`;
  const existing = groups.get(key) ?? {
    fleetId: subscription.fleet_id,
    planCode: plan.code,
    planMaxVehicles: plan.max_vehicles,
    activeSlots: 0,
    subscriptionCount: 0,
  };
  existing.activeSlots += subscription.vehicle_slots ?? plan.max_vehicles_per_subscription ?? plan.max_vehicles ?? 1;
  existing.subscriptionCount += 1;
  groups.set(key, existing);
}

const overLimit = Array.from(groups.values()).filter(
  (group) => group.activeSlots > group.planMaxVehicles,
);

const result = {
  checkedGroups: groups.size,
  overLimitGroups: overLimit.length,
  overLimit,
};

console.log(JSON.stringify(result));
if (overLimit.length > 0) {
  process.exit(1);
}
