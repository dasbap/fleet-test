#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { readFileSync } from "node:fs";
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

loadEnvFileFromExecArgv();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSuperAdmin = process.env.SUPER_ADMIN === "true" || process.argv.includes("--super-admin");
const email = (
  (isSuperAdmin ? process.env.SUPER_ADMIN_EMAIL : process.env.ADMIN_EMAIL) ||
  process.env.ADMIN_EMAIL ||
  process.argv[2] ||
  ""
)
  .trim()
  .toLowerCase();
const password = (
  (isSuperAdmin ? process.env.SUPER_ADMIN_PASSWORD : process.env.ADMIN_PASSWORD) ||
  process.env.ADMIN_PASSWORD ||
  process.argv[3] ||
  ""
).trim();
const fullName = (
  (isSuperAdmin ? process.env.SUPER_ADMIN_FULL_NAME : process.env.ADMIN_FULL_NAME) ||
  process.env.ADMIN_FULL_NAME ||
  process.argv[4] ||
  "Administrateur E-Samba"
).trim();

if (!url || !key || !email) {
  console.error(
    "Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... node --env-file=.env.local scripts/create-platform-admin.mjs",
  );
  console.error(
    "Variables requises: VITE_SUPABASE_URL/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL ou SUPER_ADMIN_EMAIL",
  );
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

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

async function findUserByEmailInPostgres(targetEmail) {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) return null;

  const client = new Client(
    buildPgClientConfig({
      databaseUrl: connectionString,
      env: { ...process.env, SUPABASE_DB_SSL_NO_VERIFY: "1" },
    }),
  );

  try {
    await client.connect();
    const result = await client.query(
      `
        select id::text, email, raw_user_meta_data
        from auth.users
        where lower(email) = lower($1)
        limit 1
      `,
      [targetEmail],
    );
    const user = result.rows[0];
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      user_metadata: user.raw_user_meta_data ?? {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function findUserByEmail(targetEmail) {
  try {
    let page = 1;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const found = data.users.find((user) => user.email?.toLowerCase() === targetEmail);
      if (found) return found;
      if (data.users.length < 200) return null;
      page += 1;
    }
  } catch (error) {
    const user = await findUserByEmailInPostgres(targetEmail);
    return user;
  }
}

let user = await findUserByEmail(email);

if (!user) {
  if (!password) {
    console.error("ADMIN_PASSWORD/SUPER_ADMIN_PASSWORD requis pour creer un nouvel utilisateur admin.");
    process.exit(1);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, created_by_bootstrap: true },
  });
  if (error || !data.user) throw error ?? new Error("auth_create_failed");
  user = data.user;
} else {
  const attributes = {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      full_name: fullName,
      name: fullName,
    },
  };

  if (password) {
    attributes.password = password;
  }

  const { data, error } = await admin.auth.admin.updateUserById(user.id, attributes);
  if (error || !data.user) throw error ?? new Error("auth_update_failed");
  user = data.user;
}

const { error: profileError } = await admin.from("profils").upsert(
  {
    user_id: user.id,
    full_name: fullName,
  },
  { onConflict: "user_id" },
);
if (profileError) throw profileError;

const { error: adminProfileError } = await admin.from("admin_profiles").upsert(
  {
    user_id: user.id,
    is_active: true,
    internal_role: isSuperAdmin ? "super_admin" : "admin",
    notes: "Bootstrap platform admin",
  },
  { onConflict: "user_id" },
);
if (adminProfileError) throw adminProfileError;

console.log(JSON.stringify({ ok: true, user_id: user.id, email, super_admin: isSuperAdmin }, null, 2));
