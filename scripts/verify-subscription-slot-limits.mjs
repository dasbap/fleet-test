import pg from "pg";
import { buildPgClientConfig } from "./apply-sql-file.mjs";

function resolveVerifierDatabaseUrl(env) {
  const direct = env.SUPABASE_DB_URL?.trim() || env.DATABASE_URL?.trim() || env.DIRECT_URL?.trim();
  if (direct) {
    try {
      new URL(direct);
      return direct;
    } catch {
      // Keep going: some checked-in local env values contain unencoded characters.
    }
  }

  const password = env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const ref = supabaseUrl?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  if (password && ref) {
    return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`;
  }

  return null;
}

const databaseUrl = resolveVerifierDatabaseUrl(process.env);
if (!databaseUrl) {
  console.error(
    "ERREUR: connexion DB manquante (.env.local). Ajoutez DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL",
  );
  process.exit(1);
}

const client = new pg.Client(buildPgClientConfig({ databaseUrl, env: process.env }));

try {
  await client.connect();
  const { rows } = await client.query(`
    with active_subscription_slots as (
      select
        a.fleet_id,
        a.plan_id,
        p.code as plan_code,
        p.max_vehicles,
        sum(coalesce(a.vehicle_slots, p.max_vehicles_per_subscription, p.max_vehicles, 1))::int as active_slots
      from public.abonnements a
      join public.plans p on p.id = a.plan_id
      where public.is_vehicle_subscription_status_active(a.status)
        and p.max_vehicles is not null
      group by a.fleet_id, a.plan_id, p.code, p.max_vehicles
    )
    select
      exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'trg_enforce_fleet_subscription_total_vehicle_slots'
      ) as function_exists,
      exists (
        select 1
        from pg_trigger
        where tgname = 'trg_abonnements_fleet_subscription_total_vehicle_slots'
          and not tgisinternal
      ) as trigger_exists,
      coalesce(count(*) filter (where active_slots > max_vehicles), 0)::int as over_limit_groups
    from active_subscription_slots;
  `);

  const result = rows[0];
  console.log(JSON.stringify(result));
  if (!result?.function_exists || !result?.trigger_exists || Number(result.over_limit_groups) !== 0) {
    process.exit(1);
  }
} finally {
  await client.end();
}
