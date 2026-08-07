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
  select column_name
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'abonnements'
     and column_name in ('cancelled_at', 'cancelled_by')
   order by column_name
`);

await client.end();

console.log(JSON.stringify(rows, null, 2));
