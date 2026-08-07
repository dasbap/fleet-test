import pg from "pg";

const { Client } = pg;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl || !password) {
  throw new Error("VITE_SUPABASE_URL et SUPABASE_DB_PASSWORD sont requis");
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const client = new Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: "postgres",
  user: "postgres",
  password,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const { rows } = await client.query(`
  select
    position('a.created_at' in pg_get_functiondef('public.admin_apply_fleet_plan_internal(uuid,text,uuid,text,boolean)'::regprocedure)) = 0 as no_missing_created_at_order,
    position('a.starts_at desc nulls last, a.id desc' in pg_get_functiondef('public.admin_apply_fleet_plan_internal(uuid,text,uuid,text,boolean)'::regprocedure)) > 0 as stable_id_order
`);

await client.end();

console.log(JSON.stringify(rows[0], null, 2));
