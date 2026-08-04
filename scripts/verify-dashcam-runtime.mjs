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

const { rows: tables } = await client.query(`
  select table_name
    from information_schema.tables
   where table_schema = 'public'
     and table_name in ('dashcams', 'dashcam_alerts')
   order by table_name
`);

const { rows: columns } = await client.query(`
  select table_name, column_name
    from information_schema.columns
   where table_schema = 'public'
     and (
       (table_name = 'dashcams' and column_name in (
         'fleet_id', 'vehicle_id', 'name', 'brand', 'channel', 'stream_url',
         'is_active', 'last_seen_at', 'firmware_ver', 'created_at'
       ))
       or
       (table_name = 'dashcam_alerts' and column_name in (
         'dashcam_id', 'fleet_id', 'vehicle_id', 'driver_user_id', 'alert_type',
         'severity', 'confidence', 'snapshot_url', 'video_clip_url', 'gps_lat',
         'gps_lon', 'speed_kmh', 'ai_provider', 'acknowledged', 'ack_at', 'created_at'
       ))
     )
   order by table_name, column_name
`);

const { rows: policies } = await client.query(`
  select tablename, policyname, roles, cmd
    from pg_policies
   where schemaname = 'public'
     and tablename in ('dashcams', 'dashcam_alerts')
   order by tablename, policyname
`);

await client.end();

console.log(JSON.stringify({ tables, columns, policies }, null, 2));
