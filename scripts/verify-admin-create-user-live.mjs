#!/usr/bin/env node
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { buildPgClientConfig, resolveDatabaseUrl } from "./apply-sql-file.mjs";

const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

for (const key of required) {
  if (!process.env[key]?.trim()) {
    throw new Error(`Variable requise absente: ${key}`);
  }
}

const databaseUrl = resolveDatabaseUrl(process.env);
if (!databaseUrl) throw new Error("Connexion PostgreSQL de nettoyage absente");

const supabaseUrl = process.env.VITE_SUPABASE_URL.trim();
const anonKey = process.env.VITE_SUPABASE_ANON_KEY.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
const adminEmail = process.env.ADMIN_EMAIL.trim();
const adminPassword = process.env.ADMIN_PASSWORD;
const apiBaseUrl = (process.env.API_BASE_URL || "https://www.e-samba.com").replace(/\/$/, "");
const fleetId = process.env.TEST_FLEET_ID?.trim() || "";
const requestedRoles = (process.env.TEST_ROLES || "organizer")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const allowedRoles = new Set(["organizer", "manager", "driver", "mechanic"]);

if (!requestedRoles.length || requestedRoles.some((role) => !allowedRoles.has(role))) {
  throw new Error("TEST_ROLES invalide");
}

if (requestedRoles.some((role) => role !== "organizer") && !fleetId) {
  throw new Error("TEST_FLEET_ID est requis pour manager, driver ou mechanic");
}

const runMarker = `${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`;
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pg = new Client(
  buildPgClientConfig({
    databaseUrl,
    env: { ...process.env, SUPABASE_DB_SSL_NO_VERIFY: "1" },
  }),
);

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function findAuthUserByEmail(email) {
  const result = await pg.query(
    "select id::text, email from auth.users where lower(email) = lower($1) limit 1",
    [email],
  );
  return result.rows[0] || null;
}

async function publicColumns() {
  const result = await pg.query(`
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and data_type in ('uuid', 'text', 'character varying', 'json', 'jsonb')
    order by table_name, ordinal_position
  `);
  return result.rows;
}

async function cleanupPublicRows(userId, email) {
  const columns = await publicColumns();
  const tables = new Map();

  for (const column of columns) {
    const list = tables.get(column.table_name) || [];
    list.push(column);
    tables.set(column.table_name, list);
  }

  let totalDeleted = 0;
  let lastErrors = [];

  for (let pass = 0; pass < 5; pass += 1) {
    let passDeleted = 0;
    const errors = [];

    for (const [table, tableColumns] of tables) {
      const clauses = [];
      const params = [];

      for (const column of tableColumns) {
        const name = quoteIdent(column.column_name);
        if (column.data_type === "uuid" && userId) {
          params.push(userId);
          clauses.push(`${name} = $${params.length}::uuid`);
        } else if (
          ["text", "character varying"].includes(column.data_type) &&
          email
        ) {
          params.push(email);
          clauses.push(`${name} = $${params.length}`);
          params.push(`%${email}%`);
          clauses.push(`${name} like $${params.length}`);
        } else if (["json", "jsonb"].includes(column.data_type) && email) {
          params.push(`%${email}%`);
          clauses.push(`${name}::text like $${params.length}`);
          if (userId) {
            params.push(`%${userId}%`);
            clauses.push(`${name}::text like $${params.length}`);
          }
        }
      }

      if (!clauses.length) continue;

      try {
        const result = await pg.query(
          `delete from public.${quoteIdent(table)} where ${clauses.join(" or ")}`,
          params,
        );
        passDeleted += result.rowCount || 0;
      } catch (error) {
        errors.push(`${table}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    totalDeleted += passDeleted;
    lastErrors = errors;
    if (passDeleted === 0) break;
  }

  return { totalDeleted, errors: lastErrors };
}

async function countPublicTraces(userId, email) {
  const columns = await publicColumns();
  const traces = [];

  for (const column of columns) {
    const table = quoteIdent(column.table_name);
    const name = quoteIdent(column.column_name);
    let sql = "";
    let params = [];

    if (column.data_type === "uuid" && userId) {
      sql = `select count(*)::int as count from public.${table} where ${name} = $1::uuid`;
      params = [userId];
    } else if (["text", "character varying"].includes(column.data_type) && email) {
      sql = `select count(*)::int as count from public.${table} where ${name} like $1`;
      params = [`%${email}%`];
    } else if (["json", "jsonb"].includes(column.data_type) && email) {
      sql = `select count(*)::int as count from public.${table} where ${name}::text like $1${userId ? ` or ${name}::text like $2` : ""}`;
      params = userId ? [`%${email}%`, `%${userId}%`] : [`%${email}%`];
    } else {
      continue;
    }

    const result = await pg.query(sql, params);
    const count = result.rows[0]?.count || 0;
    if (count > 0) traces.push({ table: column.table_name, column: column.column_name, count });
  }

  return traces;
}

async function cleanupIdentity(identity) {
  const found = identity.userId ? { id: identity.userId, email: identity.email } : await findAuthUserByEmail(identity.email);
  const userId = found?.id || null;

  await cleanupPublicRows(userId, identity.email);

  if (userId) {
    const { error } = await adminClient.auth.admin.deleteUser(userId, false);
    if (error) {
      await cleanupPublicRows(userId, identity.email);
      await pg.query("delete from auth.users where id = $1::uuid", [userId]);
    }
  }

  await cleanupPublicRows(userId, identity.email);

  const authRemaining = await pg.query(
    "select count(*)::int as count from auth.users where lower(email) = lower($1) or ($2::uuid is not null and id = $2::uuid)",
    [identity.email, userId],
  );
  const publicTraces = await countPublicTraces(userId, identity.email);

  return {
    email: identity.email,
    user_id: userId,
    auth_remaining: authRemaining.rows[0]?.count || 0,
    public_traces: publicTraces,
  };
}

const created = [];
let testError = null;
let cleanupError = null;

try {
  await pg.connect();

  const { data: login, error: loginError } = await authClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (loginError || !login.session?.access_token) {
    throw new Error(`Connexion admin impossible: ${loginError?.message || "session_absente"}`);
  }

  const { data: isAdmin, error: adminCheckError } = await authClient.rpc("is_platform_admin");
  if (adminCheckError || isAdmin !== true) {
    throw new Error("Le compte de test n'est pas reconnu comme admin plateforme");
  }

  for (let index = 0; index < requestedRoles.length; index += 1) {
    const role = requestedRoles[index];
    const email = `ci-provision-${runMarker}-${index}@example.com`.toLowerCase();
    const identity = { email, role, userId: null };
    created.push(identity);

    const body = {
      email,
      full_name: `CI Provision ${runMarker} ${role}`,
      phone: "",
      role,
      platform_admin: false,
      ...(role === "organizer" ? {} : { fleet_id: fleetId }),
    };

    const response = await fetch(`${apiBaseUrl}/api/admin/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${login.session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok !== true || !payload?.user_id) {
      throw new Error(
        `Creation ${role} echouee: HTTP ${response.status} ${JSON.stringify(payload)}`,
      );
    }

    identity.userId = payload.user_id;

    const profile = await pg.query(
      "select user_id::text from public.profils where user_id = $1::uuid limit 1",
      [identity.userId],
    );
    if (!profile.rowCount) throw new Error(`Profil absent pour ${role}`);

    if (role !== "organizer") {
      const membership = await pg.query(
        "select role from public.flotte_adhesions where user_id = $1::uuid and fleet_id = $2::uuid and role::text = $3 limit 1",
        [identity.userId, fleetId, role],
      );
      if (!membership.rowCount) throw new Error(`Adhesion absente pour ${role}`);
    }

    console.log(JSON.stringify({ created: true, role, user_id: identity.userId }));
  }
} catch (error) {
  testError = error;
} finally {
  if (!pg._connected) {
    await pg.connect().catch(() => {});
  }

  const cleanupResults = [];
  try {
    for (const identity of [...created].reverse()) {
      cleanupResults.push(await cleanupIdentity(identity));
    }

    const dirty = cleanupResults.filter(
      (result) => result.auth_remaining > 0 || result.public_traces.length > 0,
    );
    console.log(JSON.stringify({ cleanup: cleanupResults }, null, 2));
    if (dirty.length) {
      cleanupError = new Error(`Nettoyage incomplet: ${JSON.stringify(dirty)}`);
    }
  } catch (error) {
    cleanupError = error;
  }

  await authClient.auth.signOut().catch(() => {});
  await pg.end().catch(() => {});
}

if (cleanupError) {
  console.error(cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
  process.exit(2);
}

if (testError) {
  console.error(testError instanceof Error ? testError.message : String(testError));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, tested_roles: requestedRoles, cleanup_verified: true }, null, 2));
