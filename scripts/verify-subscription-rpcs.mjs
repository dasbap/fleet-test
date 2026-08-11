import pg from "pg";
import { buildPgClientConfig, resolveDatabaseUrl } from "./apply-sql-file.mjs";

const databaseUrl = resolveDatabaseUrl(process.env);

if (!databaseUrl) {
  console.error(
    "ERREUR: connexion DB manquante. Ajoutez DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL.",
  );
  process.exit(1);
}

const client = new pg.Client(buildPgClientConfig({ databaseUrl, env: process.env }));

try {
  await client.connect();

  const { rows } = await client.query(`
    select
      exists (
        select 1
        from supabase_migrations.schema_migrations
        where version = '20260810120000'
      ) as migration_recorded,
      to_regprocedure('public.admin_list_subscription_grant_options()')::text as list_options_rpc,
      to_regprocedure('public.admin_create_fleet_subscription(uuid,text,timestamptz,boolean,boolean,integer,text)')::text as create_subscription_rpc,
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'abonnements'
          and column_name = 'vehicle_slots'
      ) as vehicle_slots_column;
  `);

  console.log(JSON.stringify(rows[0], null, 2));
} finally {
  await client.end();
}
