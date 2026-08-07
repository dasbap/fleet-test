#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { buildPgClientConfig } from "./apply-sql-file.mjs";

const ROOT = new URL("../", import.meta.url);
const DRY_RUN = process.argv.includes("--dry-run");
const VERIFY_ONLY = process.argv.includes("--verify-only");

function parseEnv(content) {
  const env = new Map();
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
    env.set(key, value);
  }
  return env;
}

async function readEnvFile(name) {
  const url = new URL(name, ROOT);
  const content = await readFile(url, "utf8");
  return { url, content, env: parseEnv(content) };
}

function getProjectRef(env) {
  const supabaseUrl = env.get("VITE_SUPABASE_URL") || env.get("SUPABASE_URL") || "";
  return supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1] ?? null;
}

function createSupabase(env, label) {
  const url = env.get("SUPABASE_URL") || env.get("VITE_SUPABASE_URL");
  const serviceRoleKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error(`${label}: VITE_SUPABASE_URL/SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis`);
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

function resolveDatabaseUrl(env, label) {
  for (const key of ["DATABASE_URL", "DIRECT_URL", "SUPABASE_DB_URL"]) {
    const direct = env.get(key);
    if (!direct) continue;
    try {
      new URL(direct);
      return direct;
    } catch {
      // Some local env files keep placeholders or shell-specific values here.
    }
  }

  const dbPassword = env.get("SUPABASE_DB_PASSWORD");
  const ref = getProjectRef(env);
  if (dbPassword && ref) {
    return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
  }
  throw new Error(`${label}: connexion DB requise (DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL ou SUPABASE_DB_PASSWORD)`);
}

function createPg(env, label) {
  return new Client(
    buildPgClientConfig({
      databaseUrl: resolveDatabaseUrl(env, label),
      env: { ...Object.fromEntries(env), SUPABASE_DB_SSL_NO_VERIFY: "1" },
    }),
  );
}

async function getAuthUserByEmail(pg, email) {
  const result = await pg.query(
    `
      select id::text, email, raw_user_meta_data
      from auth.users
      where lower(email) = lower($1)
      limit 1
    `,
    [email],
  );
  return result.rows[0] ?? null;
}

async function getAuthUsersByIds(pg, userIds) {
  const result = await pg.query(
    `
      select id::text, email, raw_user_meta_data
      from auth.users
      where id = any($1::uuid[])
    `,
    [userIds],
  );
  return new Map(result.rows.map((user) => [user.id, user]));
}

async function getPlatformAdmins(pg, label) {
  const result = await pg.query(`
    select user_id::text, is_active, internal_role, notes
    from public.admin_profiles
    where is_active = true
      and internal_role in ('admin', 'super_admin')
    order by internal_role, created_at
  `);
  const profiles = result.rows;
  const usersById = await getAuthUsersByIds(
    pg,
    profiles.map((profile) => profile.user_id),
  );

  return profiles
    .map((profile) => {
      const user = usersById.get(profile.user_id);
      const metadata = user?.raw_user_meta_data ?? {};
      return {
        ...profile,
        email: user?.email?.toLowerCase() ?? null,
        full_name: metadata.full_name ?? metadata.name ?? null,
      };
    })
    .filter((profile) => profile.email);
}

function pickOneByRole(admins, role) {
  const matches = admins.filter((admin) => admin.internal_role === role);
  if (matches.length !== 1) {
    throw new Error(`local: attendu exactement 1 ${role}, trouve ${matches.length}`);
  }
  return matches[0];
}

async function ensureAuthUser(pg, client, source) {
  const existing = await getAuthUserByEmail(pg, source.email);
  if (existing) return { user: existing, created: false };

  if (DRY_RUN) {
    return {
      user: {
        id: randomUUID(),
        email: source.email,
      },
      created: true,
    };
  }

  const { data, error } = await client.auth.admin.createUser({
    email: source.email,
    email_confirm: true,
    user_metadata: {
      full_name: source.full_name,
      created_by_bootstrap: true,
      copied_from_local_admin: true,
    },
  });

  if (error || !data.user) {
    throw error ?? new Error(`prod: creation auth user impossible pour ${source.email}`);
  }
  const created = await getAuthUserByEmail(pg, source.email);
  return { user: created ?? data.user, created: true };
}

async function upsertProdProfile(pg, user, source) {
  if (DRY_RUN) return;

  await pg.query(
    `
      insert into public.profils (user_id, full_name)
      values ($1::uuid, $2)
      on conflict (user_id) do update
        set full_name = excluded.full_name
    `,
    [user.id, source.full_name || source.email],
  );

  await pg.query(
    `
      insert into public.admin_profiles (user_id, is_active, internal_role, notes)
      values ($1::uuid, true, $2, 'Synced from local platform admin')
      on conflict (user_id) do update
        set is_active = true,
            internal_role = excluded.internal_role,
            notes = excluded.notes
    `,
    [user.id, source.internal_role],
  );
}

async function removeDemoProfile(pg, userId) {
  if (DRY_RUN) {
    const result = await pg.query("select count(*)::int as count from public.demo_profiles where user_id = $1::uuid", [
      userId,
    ]);
    return result.rows[0]?.count ?? 0;
  }

  const result = await pg.query("delete from public.demo_profiles where user_id = $1::uuid returning user_id", [
    userId,
  ]);
  return result.rowCount ?? 0;
}

function setEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  const suffix = content.endsWith("\n") ? "" : "\n";
  return `${content}${suffix}${line}\n`;
}

async function writeProdIds(prodEnvFile, ids) {
  let content = prodEnvFile.content;
  content = setEnvValue(content, "PROD_PLATFORM_ADMIN_USER_ID", ids.admin);
  content = setEnvValue(content, "PROD_PLATFORM_SUPER_ADMIN_USER_ID", ids.superAdmin);
  await writeFile(prodEnvFile.url, content, "utf8");
}

async function assertNotDemo(pg, userIds) {
  const result = await pg.query(
    "select user_id::text from public.demo_profiles where user_id = any($1::uuid[])",
    [userIds],
  );
  return result.rows;
}

async function verifyProdIds(prodPg, prodEnvFile) {
  const expected = [
    {
      key: "PROD_PLATFORM_ADMIN_USER_ID",
      role: "admin",
      userId: prodEnvFile.env.get("PROD_PLATFORM_ADMIN_USER_ID"),
    },
    {
      key: "PROD_PLATFORM_SUPER_ADMIN_USER_ID",
      role: "super_admin",
      userId: prodEnvFile.env.get("PROD_PLATFORM_SUPER_ADMIN_USER_ID"),
    },
  ];

  const checks = [];
  for (const item of expected) {
    checks.push({ check: `${item.key}_present`, ok: Boolean(item.userId) });
    if (!item.userId) continue;

    const user = await prodPg.query(
      "select id::text, email from auth.users where id = $1::uuid limit 1",
      [item.userId],
    );
    checks.push({
      check: `${item.role}_auth_user`,
      ok: user.rowCount === 1,
      user_id: item.userId,
      email: user.rows[0]?.email ?? null,
    });

    const profile = await prodPg.query(
      `
        select internal_role, is_active
        from public.admin_profiles
        where user_id = $1::uuid
        limit 1
      `,
      [item.userId],
    );
    checks.push({
      check: `${item.role}_admin_profile`,
      ok:
        profile.rowCount === 1 &&
        profile.rows[0]?.internal_role === item.role &&
        profile.rows[0]?.is_active === true,
      role: profile.rows[0]?.internal_role ?? null,
      is_active: profile.rows[0]?.is_active ?? null,
    });

    const demo = await prodPg.query(
      "select count(*)::int as count from public.demo_profiles where user_id = $1::uuid",
      [item.userId],
    );
    checks.push({
      check: `${item.role}_not_in_demo_profiles`,
      ok: demo.rows[0]?.count === 0,
      demo_rows: demo.rows[0]?.count ?? null,
    });
  }

  const superAdmins = await prodPg.query(`
    select count(*)::int as count
    from public.admin_profiles
    where is_active = true
      and internal_role = 'super_admin'
  `);
  checks.push({
    check: "single_active_super_admin",
    ok: superAdmins.rows[0]?.count === 1,
    count: superAdmins.rows[0]?.count ?? null,
  });

  const failed = checks.filter((check) => !check.ok);
  return { ok: failed.length === 0, checks };
}

const localEnvFile = await readEnvFile(".env.local");
const prodEnvFile = await readEnvFile(".env.prod");
const localPg = createPg(localEnvFile.env, "local");
const prodPg = createPg(prodEnvFile.env, "prod");
const prodClient = createSupabase(prodEnvFile.env, "prod");

await localPg.connect();
await prodPg.connect();

if (VERIFY_ONLY) {
  const verification = await verifyProdIds(prodPg, prodEnvFile);
  console.log(JSON.stringify(verification, null, 2));
  await localPg.end();
  await prodPg.end();
  process.exit(verification.ok ? 0 : 1);
}

const localAdmins = await getPlatformAdmins(localPg, "local");
const localAdmin = pickOneByRole(localAdmins, "admin");
const localSuperAdmin = pickOneByRole(localAdmins, "super_admin");

const plan = {
  dry_run: DRY_RUN,
  local_ref: getProjectRef(localEnvFile.env),
  prod_ref: getProjectRef(prodEnvFile.env),
  source_accounts: [
    { email: localAdmin.email, role: localAdmin.internal_role, local_user_id: localAdmin.user_id },
    {
      email: localSuperAdmin.email,
      role: localSuperAdmin.internal_role,
      local_user_id: localSuperAdmin.user_id,
    },
  ],
};

const results = [];
for (const source of [localAdmin, localSuperAdmin]) {
  const { user, created } = await ensureAuthUser(prodPg, prodClient, source);
  await upsertProdProfile(prodPg, user, source);
  const deletedDemoRows = await removeDemoProfile(prodPg, user.id);
  results.push({
    email: source.email,
    role: source.internal_role,
    prod_user_id: user.id,
    auth_user_created: created,
    deleted_demo_rows: deletedDemoRows,
  });
}

const adminResult = results.find((result) => result.role === "admin");
const superAdminResult = results.find((result) => result.role === "super_admin");

if (!DRY_RUN) {
  await writeProdIds(prodEnvFile, {
    admin: adminResult.prod_user_id,
    superAdmin: superAdminResult.prod_user_id,
  });
}

const remainingDemoRows = DRY_RUN
  ? []
  : await assertNotDemo(
      prodPg,
      results.map((result) => result.prod_user_id),
    );

console.log(
  JSON.stringify(
    {
      ok: remainingDemoRows.length === 0,
      ...plan,
      results,
      env_prod_updated: !DRY_RUN,
      remaining_demo_rows: remainingDemoRows,
    },
    null,
    2,
  ),
);

await localPg.end();
await prodPg.end();
