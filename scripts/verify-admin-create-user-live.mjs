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
if (!databaseUrl) {
  throw new Error("Connexion PostgreSQL de nettoyage absente");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL.trim();
const anonKey = process.env.VITE_SUPABASE_ANON_KEY.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
const adminEmail = process.env.ADMIN_EMAIL.trim();
const adminPassword = process.env.ADMIN_PASSWORD;
const apiBaseUrl = (process.env.API_BASE_URL || "https://www.e-samba.com").replace(/\/$/, "");
const runMarker = `${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`;
const testEmail = `ci-provision-${runMarker}@example.com`.toLowerCase();

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

async function getPublicSearchColumns() {
  const result = await pg.query(`
    select c.table_name, c.column_name, c.data_type
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and c.data_type in ('uuid', 'text', 'character varying', 'json', 'jsonb')
    order by c.table_name, c.ordinal_position
  `);
  return result.rows;
}

function buildMatch(column, params, userId, email) {
  const name = quoteIdent(column.column_name);

  if (column.data_type === "uuid" && userId) {
    params.push(userId);
    return `${name} = $${params.length}::uuid`;
  }

  if (["text", "character varying"].includes(column.data_type) && email) {
    params.push(email);
    return `lower(${name}) = lower($${params.length})`;
  }

  if (["json", "jsonb"].includes(column.data_type)) {
    const clauses = [];
    if (email) {
      params.push(`%${email}%`);
      clauses.push(`${name}::text ilike $${params.length}`);
    }
    if (userId) {
      params.push(`%${userId}%`);
      clauses.push(`${name}::text ilike $${params.length}`);
    }
    return clauses.length ? `(${clauses.join(" or ")})` : null;
  }

  return null;
}

async function groupPublicColumns() {
  const columns = await getPublicSearchColumns();
  const tables = new Map();
  for (const column of columns) {
    const list = tables.get(column.table_name) || [];
    list.push(column);
    tables.set(column.table_name, list);
  }
  return tables;
}

async function deletePublicTraces(userId, email) {
  const tables = await groupPublicColumns();
  const deletionLog = [];
  let lastErrors = [];

  // Plusieurs passes permettent de respecter progressivement les dépendances FK.
  for (let pass = 1; pass <= 6; pass += 1) {
    let deletedThisPass = 0;
    const errors = [];

    for (const [tableName, columns] of tables) {
      const params = [];
      const clauses = columns
        .map((column) => buildMatch(column, params, userId, email))
        .filter(Boolean);

      if (!clauses.length) continue;

      try {
        const result = await pg.query(
          `delete from public.${quoteIdent(tableName)} where ${clauses.join(" or ")}`,
          params,
        );
        const count = result.rowCount || 0;
        if (count > 0) {
          deletedThisPass += count;
          deletionLog.push({ pass, table: tableName, deleted: count });
        }
      } catch (error) {
        errors.push({
          table: tableName,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    lastErrors = errors;
    if (deletedThisPass === 0) break;
  }

  return { deletionLog, errors: lastErrors };
}

async function findPublicTraces(userId, email) {
  const tables = await groupPublicColumns();
  const traces = [];

  for (const [tableName, columns] of tables) {
    const params = [];
    const clauses = columns
      .map((column) => buildMatch(column, params, userId, email))
      .filter(Boolean);

    if (!clauses.length) continue;

    const result = await pg.query(
      `select count(*)::int as count from public.${quoteIdent(tableName)} where ${clauses.join(" or ")}`,
      params,
    );
    const count = result.rows[0]?.count || 0;
    if (count > 0) traces.push({ table: tableName, count });
  }

  return traces;
}

async function cleanup(createdUserId) {
  const found = createdUserId
    ? { id: createdUserId, email: testEmail }
    : await findAuthUserByEmail(testEmail);
  const userId = found?.id || null;

  const beforeAuthDelete = await deletePublicTraces(userId, testEmail);

  if (userId) {
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId, false);
    if (deleteError) {
      // Fallback réservé au test CI si l'Admin API échoue après nettoyage des FK publiques.
      await pg.query("delete from auth.users where id = $1::uuid", [userId]);
    }
  }

  const afterAuthDelete = await deletePublicTraces(userId, testEmail);

  const authRemaining = await pg.query(
    `select count(*)::int as count
       from auth.users
      where lower(email) = lower($1)
         or ($2::uuid is not null and id = $2::uuid)`,
    [testEmail, userId],
  );
  const publicTraces = await findPublicTraces(userId, testEmail);

  const result = {
    user_id: userId,
    auth_remaining: authRemaining.rows[0]?.count || 0,
    public_traces: publicTraces,
    cleanup_errors: [...beforeAuthDelete.errors, ...afterAuthDelete.errors],
    rows_deleted: [...beforeAuthDelete.deletionLog, ...afterAuthDelete.deletionLog],
  };

  if (result.auth_remaining !== 0 || result.public_traces.length !== 0) {
    throw new Error(`Nettoyage incomplet: ${JSON.stringify(result)}`);
  }

  return result;
}

let createdUserId = null;
let primaryError = null;
let cleanupError = null;

try {
  await pg.connect();

  const { data: login, error: loginError } = await authClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (loginError || !login.session?.access_token) {
    throw new Error(
      `Connexion admin impossible: ${loginError?.message || "session_absente"}`,
    );
  }

  const { data: isAdmin, error: adminCheckError } = await authClient.rpc("is_platform_admin");
  if (adminCheckError || isAdmin !== true) {
    throw new Error("Compte non reconnu comme admin plateforme");
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${login.session.access_token}`,
    },
    body: JSON.stringify({
      email: testEmail,
      full_name: `CI Provision ${runMarker}`,
      phone: "",
      role: "organizer",
      platform_admin: false,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok !== true || !payload?.user_id) {
    throw new Error(
      `Creation echouee: HTTP ${response.status} ${JSON.stringify(payload)}`,
    );
  }

  createdUserId = payload.user_id;

  const profile = await pg.query(
    "select user_id::text from public.profils where user_id = $1::uuid limit 1",
    [createdUserId],
  );
  if (!profile.rowCount) {
    throw new Error("Profil utilisateur absent apres creation");
  }

  console.log(
    JSON.stringify({
      ok: true,
      created: true,
      user_id: createdUserId,
      email: testEmail,
    }),
  );
} catch (error) {
  primaryError = error;
} finally {
  try {
    const cleanupResult = await cleanup(createdUserId);
    console.log(JSON.stringify({ cleanup: cleanupResult }, null, 2));
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

if (primaryError) {
  console.error(primaryError instanceof Error ? primaryError.message : String(primaryError));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, cleanup_verified: true }));
