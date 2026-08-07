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
    position('v_admin_actor_is_valid' in pg_get_functiondef('public.admin_log_action(uuid,text,text,uuid,text,jsonb)'::regprocedure)) > 0 as has_actor_bypass,
    position('ap.user_id = p_admin_user_id' in pg_get_functiondef('public.admin_log_action(uuid,text,text,uuid,text,jsonb)'::regprocedure)) > 0 as validates_stored_admin_actor
`);

await client.end();

console.log(JSON.stringify(rows[0], null, 2));
