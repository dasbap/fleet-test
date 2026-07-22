import { Client } from "pg";

function resolveConnectionString() {
  const direct = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (direct) return direct;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!ref || !password) {
    throw new Error("SUPABASE_DB_URL/DATABASE_URL or SUPABASE_DB_PASSWORD + SUPABASE_URL required");
  }
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

const legacyNames = [
  "Flotte DEMO Starter",
  "Flotte DEMO Pro",
  "Flotte DEMO Entreprise",
  "Flotte DEMO Organisateur",
];

const client = new Client({
  connectionString: resolveConnectionString(),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  const { rows } = await client.query(
    `
      select
        (
          select count(*)::int
            from public.flottes
           where name = any($1::text[])
        ) as legacy_demo_fleets,
        (
          select count(*)::int
            from public.demo_profiles dp
            join public.flottes f on f.id = dp.fleet_id
           where f.name = any($1::text[])
        ) as demo_profiles_on_legacy_fleets,
        (
          select count(*)::int
            from public.demo_profiles
           where fleet_id is null
        ) as demo_profiles_without_fleet,
        (
          select pg_get_functiondef(
            'public.prospect_create_account(uuid,text,text,uuid,uuid,int,text,boolean)'::regprocedure
          ) like '%demo_fleet_assignment_not_allowed_at_creation%'
        ) as rpc_blocks_creation_fleet_assignment
    `,
    [legacyNames],
  );

  console.log(JSON.stringify(rows[0], null, 2));
} finally {
  await client.end();
}
