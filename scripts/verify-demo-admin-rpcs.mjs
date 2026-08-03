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

const client = new Client({
  connectionString: resolveConnectionString(),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  const { rows } = await client.query(`
    select
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args,
      has_function_privilege(
        'authenticated',
        p.oid,
        'EXECUTE'
      ) as authenticated_can_execute
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'deactivate_demo_account',
        'delete_demo_account',
        'reactivate_demo_account',
        'update_demo_account_expiration'
      )
    order by p.proname;
  `);

  console.log(JSON.stringify(rows, null, 2));
} finally {
  await client.end();
}
