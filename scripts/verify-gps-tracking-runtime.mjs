#!/usr/bin/env node

import pg from 'pg';
import { buildPgClientConfig } from './apply-sql-file.mjs';

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

const url = resolveDatabaseUrl();
if (!url) {
  console.error(
    'ERREUR: connexion DB manquante (.env.local). Ajoutez DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL',
  );
  process.exit(1);
}

const expectedColumnsByTable = {
  gps_devices: [
    'id',
    'fleet_id',
    'vehicle_id',
    'imei',
    'protocol',
    'label',
    'is_active',
    'created_at',
    'updated_at',
  ],
  vehicle_positions: [
    'id',
    'fleet_id',
    'vehicle_id',
    'tracker_imei',
    'latitude',
    'longitude',
    'speed_kmh',
    'heading',
    'altitude_m',
    'tracker_time',
    'received_at',
    'raw_payload',
  ],
  vehicle_positions_latest: [
    'id',
    'vehicle_id',
    'fleet_id',
    'tracker_imei',
    'latitude',
    'longitude',
    'speed_kmh',
    'heading',
    'altitude_m',
    'tracker_time',
    'received_at',
    'updated_at',
  ],
  gps_ingest_logs: ['id', 'fleet_id', 'imei', 'status', 'reason', 'payload', 'created_at'],
};

const expectedPolicies = {
  gps_devices: ['gps_devices_select_policy', 'gps_devices_write_policy'],
  vehicle_positions: ['vehicle_positions_select_policy'],
  vehicle_positions_latest: ['vehicle_positions_latest_select_policy'],
  gps_ingest_logs: ['gps_ingest_logs_select_policy'],
};

const expectedPrivileges = [
  ['authenticated', 'public.gps_devices', 'SELECT'],
  ['authenticated', 'public.gps_devices', 'INSERT'],
  ['authenticated', 'public.gps_devices', 'UPDATE'],
  ['authenticated', 'public.gps_devices', 'DELETE'],
  ['authenticated', 'public.vehicle_positions', 'SELECT'],
  ['authenticated', 'public.vehicle_positions_latest', 'SELECT'],
  ['authenticated', 'public.gps_ingest_logs', 'SELECT'],
  ['service_role', 'public.gps_devices', 'INSERT'],
  ['service_role', 'public.vehicle_positions', 'INSERT'],
  ['service_role', 'public.vehicle_positions_latest', 'UPDATE'],
  ['service_role', 'public.gps_ingest_logs', 'INSERT'],
];

const client = new pg.Client(buildPgClientConfig({ databaseUrl: url }));

try {
  await client.connect();

  const typesResult = await client.query(`
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'gps_tracker_protocol'
  `);

  const tablesResult = await client.query(`
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = ANY($1)
    ORDER BY c.relname
  `, [Object.keys(expectedColumnsByTable)]);

  const columnsResult = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1)
    ORDER BY table_name, ordinal_position
  `, [Object.keys(expectedColumnsByTable)]);

  const policiesResult = await client.query(`
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY($1)
    ORDER BY tablename, policyname
  `, [Object.keys(expectedPolicies)]);

  const privileges = [];
  for (const [role, relation, privilege] of expectedPrivileges) {
    const result = await client.query(
      `SELECT
        CASE
          WHEN to_regclass($2) IS NULL THEN false
          ELSE has_table_privilege($1, to_regclass($2), $3)
        END AS allowed`,
      [role, relation, privilege],
    );
    privileges.push({ role, relation, privilege, allowed: result.rows[0]?.allowed === true });
  }

  const errors = [];
  if (typesResult.rows.length !== 1) errors.push('type manquant: public.gps_tracker_protocol');

  const tableByName = new Map(tablesResult.rows.map((row) => [row.relname, row]));
  const columnsByTable = columnsResult.rows.reduce((acc, row) => {
    if (!acc.has(row.table_name)) acc.set(row.table_name, new Set());
    acc.get(row.table_name).add(row.column_name);
    return acc;
  }, new Map());
  const policiesByTable = policiesResult.rows.reduce((acc, row) => {
    if (!acc.has(row.tablename)) acc.set(row.tablename, new Set());
    acc.get(row.tablename).add(row.policyname);
    return acc;
  }, new Map());

  for (const [table, expectedColumns] of Object.entries(expectedColumnsByTable)) {
    const tableRow = tableByName.get(table);
    if (!tableRow) {
      errors.push(`table manquante: public.${table}`);
      continue;
    }
    if (!tableRow.relrowsecurity) errors.push(`RLS non activee sur public.${table}`);

    const actualColumns = columnsByTable.get(table) ?? new Set();
    for (const column of expectedColumns) {
      if (!actualColumns.has(column)) errors.push(`colonne manquante: public.${table}.${column}`);
    }
  }

  for (const [table, policyNames] of Object.entries(expectedPolicies)) {
    const actualPolicies = policiesByTable.get(table) ?? new Set();
    for (const policyName of policyNames) {
      if (!actualPolicies.has(policyName)) errors.push(`policy manquante: public.${table}.${policyName}`);
    }
  }

  for (const privilege of privileges) {
    if (!privilege.allowed) {
      errors.push(`grant manquant: ${privilege.role} ${privilege.privilege} ON ${privilege.relation}`);
    }
  }

  console.log(JSON.stringify({
    types: typesResult.rows,
    tables: tablesResult.rows,
    columns: columnsResult.rows,
    policies: policiesResult.rows,
    privileges,
    errors,
  }, null, 2));

  if (errors.length > 0) process.exit(1);
} catch (err) {
  console.error('ERREUR:', err.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
