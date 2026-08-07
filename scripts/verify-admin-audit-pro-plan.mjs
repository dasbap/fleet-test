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
    to_regclass('public.admin_audit_logs') as audit_table,
    to_regprocedure('public.admin_set_fleet_plan(uuid,text,text)') as set_plan_rpc,
    to_regprocedure('public.admin_list_audit_logs(integer,text)') as audit_rpc,
    exists(
      select 1 from pg_trigger
      where tgname = 'demo_organizer_plan_after_membership'
    ) as plan_trigger,
    exists(
      select 1 from pg_trigger
      where tgname = 'admin_audit_demo_requests'
    ) as demo_audit_trigger
`);

const plans = await client.query(`
  select code, name, max_vehicles, enables_finance, enables_ai, is_active
    from public.plans
   where code in ('starter', 'pro')
   order by code
`);

await client.end();

console.log(JSON.stringify({ ...rows[0], plans: plans.rows }, null, 2));
