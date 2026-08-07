#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { buildPgClientConfig } from "./apply-sql-file.mjs";

function loadEnvFileFromExecArgv() {
  const envArg = process.execArgv.find((arg) => arg.startsWith("--env-file="));
  const envPath = envArg?.slice("--env-file=".length);
  if (!envPath) return;

  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function resolveDatabaseUrl() {
  const direct = process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim();
  if (direct) return direct;

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

function createPgClient() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Connexion DB manquante pour supprimer le super admin.");
  }

  return new Client(
    buildPgClientConfig({
      databaseUrl,
      env: { ...process.env, SUPABASE_DB_SSL_NO_VERIFY: "1" },
    }),
  );
}

async function findTargetUser(client) {
  const targetId = process.env.PROD_PLATFORM_SUPER_ADMIN_USER_ID?.trim();
  const targetEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

  if (targetId) {
    const byId = await client.query(
      "select id::text, email from auth.users where id = $1::uuid limit 1",
      [targetId],
    );
    if (byId.rowCount) return byId.rows[0];
  }

  if (targetEmail) {
    const byEmail = await client.query(
      "select id::text, email from auth.users where lower(email) = lower($1) limit 1",
      [targetEmail],
    );
    if (byEmail.rowCount) return byEmail.rows[0];
  }

  return null;
}

loadEnvFileFromExecArgv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Variables requises: VITE_SUPABASE_URL/SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const pg = createPgClient();
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

try {
  await pg.connect();
  const target = await findTargetUser(pg);
  if (!target) {
    console.log(JSON.stringify({ ok: true, deleted: false, reason: "super_admin_not_found" }, null, 2));
    process.exit(0);
  }

  await pg.query("begin");
  const demo = await pg.query("delete from public.demo_profiles where user_id = $1::uuid", [
    target.id,
  ]);
  const adminProfiles = await pg.query(
    "delete from public.admin_profiles where user_id = $1::uuid and internal_role = 'super_admin'",
    [target.id],
  );
  const profiles = await pg.query("delete from public.profils where user_id = $1::uuid", [
    target.id,
  ]);
  await pg.query("commit");

  const { error: deleteError } = await admin.auth.admin.deleteUser(target.id, false);
  if (deleteError) {
    await pg.query("update public.audit_logs set actor_id = null where actor_id = $1::uuid", [
      target.id,
    ]);
    await pg.query("delete from auth.users where id = $1::uuid", [target.id]);
  }

  const remaining = await pg.query("select id::text from auth.users where id = $1::uuid", [
    target.id,
  ]);

  console.log(
    JSON.stringify(
      {
        ok: remaining.rowCount === 0,
        deleted: true,
        user_id: target.id,
        email: target.email,
        rows_deleted: {
          demo_profiles: demo.rowCount ?? 0,
          admin_profiles: adminProfiles.rowCount ?? 0,
          profils: profiles.rowCount ?? 0,
        },
        auth_admin_delete_fallback: Boolean(deleteError),
        auth_user_remaining: remaining.rowCount ?? 0,
      },
      null,
      2,
    ),
  );

  process.exit(remaining.rowCount === 0 ? 0 : 1);
} catch (error) {
  await pg.query("rollback").catch(() => {});
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await pg.end().catch(() => {});
}
