#!/usr/bin/env node

import pg from "pg";
import { buildPgClientConfig } from "./apply-sql-file.mjs";

function resolveDatabaseUrl() {
  const direct = process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim();
  if (direct) {
    try {
      new URL(direct);
      return direct;
    } catch {
      // Keep going: some local DATABASE_URL values contain unencoded special chars.
    }
  }

  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (dbUrl) return dbUrl;

  const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  if (dbPassword && supabaseUrl) {
    const ref = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
    if (ref) {
      return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
    }
  }

  return null;
}

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  console.error(
    "ERREUR: connexion DB manquante (.env.local). Ajoutez DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL",
  );
  process.exit(1);
}

const client = new pg.Client(buildPgClientConfig({ databaseUrl }));

try {
  await client.connect();

  const enumResult = await client.query(`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'alert_type'
      AND e.enumlabel IN ('geofence_enter', 'geofence_exit')
    ORDER BY e.enumlabel
  `);

  const columnsResult = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'geofences'
      AND column_name IN ('alert_on_enter', 'alert_on_exit')
    ORDER BY column_name
  `);

  const functionResult = await client.query(`
    SELECT proname, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('raise_geofence_alert', 'raise_geofence_exit_alert')
    ORDER BY proname
  `);

  const triggerResult = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'geofence_events'
      AND trigger_name = 'trg_geofence_exit_alert'
    ORDER BY trigger_name
  `);

  const labels = new Set(enumResult.rows.map((row) => row.enumlabel));
  const columns = new Set(columnsResult.rows.map((row) => row.column_name));
  const functions = new Map(functionResult.rows.map((row) => [row.proname, row.definition]));

  const alertFunction = functions.get("raise_geofence_alert") ?? "";
  const triggerAction = triggerResult.rows[0]?.action_statement ?? "";
  const errors = [];

  for (const label of ["geofence_enter", "geofence_exit"]) {
    if (!labels.has(label)) errors.push(`type manquant: public.alert_type.${label}`);
  }
  for (const column of ["alert_on_enter", "alert_on_exit"]) {
    if (!columns.has(column)) errors.push(`colonne manquante: public.geofences.${column}`);
  }
  if (!alertFunction.includes("'geofence_enter'")) {
    errors.push("fonction manquante ou incomplete: public.raise_geofence_alert geofence_enter");
  }
  if (!alertFunction.includes("'geofence_exit'")) {
    errors.push("fonction manquante ou incomplete: public.raise_geofence_alert geofence_exit");
  }
  if (!triggerAction.includes("raise_geofence_alert")) {
    errors.push("trigger geofence_events ne pointe pas vers public.raise_geofence_alert");
  }

  console.log(
    JSON.stringify(
      {
        enumLabels: enumResult.rows,
        geofenceAlertColumns: columnsResult.rows,
        functions: functionResult.rows.map((row) => ({ proname: row.proname })),
        triggers: triggerResult.rows,
        errors,
      },
      null,
      2,
    ),
  );

  if (errors.length > 0) process.exit(1);
} catch (error) {
  console.error("ERREUR:", error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
