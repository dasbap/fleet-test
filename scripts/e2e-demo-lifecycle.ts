import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { createServerApp } from "../src/server/http/app.js";

const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Missing ${key}`);
}

const supabaseUrl = process.env.SUPABASE_URL!.trim();
const anonKey = process.env.SUPABASE_ANON_KEY!.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
const databaseUrl = process.env.DATABASE_URL!.trim();
const appUrl = (process.env.APP_URL || "http://127.0.0.1:5173").replace(/\/$/, "");

const marker = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adminEmail = `${marker}-admin@example.test`;
const visitorEmail = `${marker}-visitor@example.test`;
const adminPassword = `Adm!${marker}9Aa`;
const firstPassword = `First!${marker}8Bb`;

const service = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = () => createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pg = new Client({ connectionString: databaseUrl, ssl: false });
const app = createServerApp();

const identities = new Set<string>([adminEmail, visitorEmail]);
const userIds = new Set<string>();
let adminId = "";
let productUserId = "";
let requestId = "";

type JsonBody = {
  ok?: boolean;
  user_id?: string;
  fleet_id?: string | null;
  magic_url?: string;
  magic_link?: string;
  [key: string]: unknown;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function jsonRequest(path: string, options: RequestInit = {}) {
  const response = await app.request(`${appUrl}${path}`, options);
  let body: JsonBody | null = null;
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed === "object" && parsed !== null) body = parsed as JsonBody;
  } catch {
    // Some failure responses intentionally have no JSON body.
  }
  return { response, body };
}

async function createTestAdmin() {
  const { data, error } = await service.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: `E2E Admin ${marker}` },
  });
  if (error || !data.user) throw new Error(`Admin auth creation failed: ${error?.message}`);
  adminId = data.user.id;
  userIds.add(adminId);

  const { error: profileError } = await service.from("admin_profiles").insert({
    user_id: adminId,
    is_active: true,
    internal_role: "super_admin",
    notes: marker,
  });
  if (profileError) throw new Error(`Admin profile creation failed: ${profileError.message}`);

  const client = anon();
  const { data: login, error: loginError } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (loginError || !login.session?.access_token) throw new Error(`Admin login failed: ${loginError?.message}`);
  return { client, token: login.session.access_token };
}

async function createVerifiedVisitorSession() {
  const temporaryPassword = `Verify!${marker}7Cc`;
  const { data, error } = await service.auth.admin.createUser({
    email: visitorEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { demo_verification_pending: true },
  });
  if (error || !data.user) throw new Error(`Verification user creation failed: ${error?.message}`);
  userIds.add(data.user.id);

  const visitor = anon();
  const { data: login, error: loginError } = await visitor.auth.signInWithPassword({
    email: visitorEmail,
    password: temporaryPassword,
  });
  if (loginError || !login.session?.access_token) throw new Error(`Verification login failed: ${loginError?.message}`);
  return { visitor, token: login.session.access_token, verificationUserId: data.user.id };
}

async function submitDemoRequest(visitorToken: string, verificationUserId: string) {
  const { response, body } = await jsonRequest("/api/demo/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${visitorToken}` },
    body: JSON.stringify({
      full_name: `E2E Visitor ${marker}`,
      email: visitorEmail,
      company: `E2E Company ${marker}`,
      phone: "+237690000001",
      company_identifier: `RCCM-${marker}`,
      country_code: "CM",
    }),
  });
  assert(response.status === 200 && body?.ok === true, `Demo request failed: HTTP ${response.status} ${JSON.stringify(body)}`);

  const { data: deletedVerificationUser } = await service.auth.admin.getUserById(verificationUserId);
  assert(!deletedVerificationUser?.user, "Ephemeral verification Auth user was not deleted");

  const { data: row, error } = await service
    .from("demo_requests")
    .select("id,status,email")
    .eq("email", visitorEmail)
    .single();
  if (error || !row) throw new Error(`Demo request DB row missing: ${error?.message}`);
  requestId = row.id;
  assert(row.status === "pending", `Unexpected demo request status: ${row.status}`);
}

async function acceptRequest(adminClient: ReturnType<typeof anon>, adminToken: string) {
  const { data: pending, error: listError } = await adminClient.rpc("admin_list_demo_requests", {
    p_include_processed: false,
  });
  if (listError) throw new Error(`Admin list requests failed: ${listError.message}`);
  assert(
    Array.isArray(pending) && pending.some((row: { id?: string }) => row.id === requestId),
    "Pending request not visible to admin",
  );

  const { response: createResponse, body: createBody } = await jsonRequest("/api/admin/create-prospect", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      email: visitorEmail,
      full_name: `E2E Visitor ${marker}`,
      company_name: `E2E Company ${marker}`,
      phone: "+237690000001",
      company_identifier: `RCCM-${marker}`,
      country_code: "CM",
      account_type: "prospect",
      trial_days: 7,
      send_email: false,
      permanent_access: false,
    }),
  });
  assert(createResponse.status === 201 && createBody?.ok === true && createBody.user_id, `Prospect creation failed: HTTP ${createResponse.status} ${JSON.stringify(createBody)}`);
  productUserId = createBody.user_id;
  userIds.add(productUserId);

  const { response: linkResponse, body: linkBody } = await jsonRequest("/api/admin/generate-magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      user_id: productUserId,
      fleet_id: createBody.fleet_id ?? null,
      email: visitorEmail,
      label: `CI ${marker}`,
    }),
  });
  assert(linkResponse.status === 200 && linkBody?.ok === true && linkBody.magic_url, `Magic-link generation failed: HTTP ${linkResponse.status} ${JSON.stringify(linkBody)}`);

  const { error: finalizeError } = await adminClient.rpc("admin_finalize_demo_request", {
    p_request_id: requestId,
    p_status: "accepted",
    p_reason: "E2E accepted",
    p_provisioned_user_id: productUserId,
    p_invitation_url: linkBody.magic_url,
  });
  if (finalizeError) throw new Error(`Demo request finalize failed: ${finalizeError.message}`);

  return linkBody.magic_url;
}

async function activateMagicLinkAndSetPassword(magicUrl: string) {
  const demoToken = new URL(magicUrl).searchParams.get("token");
  assert(demoToken, `Missing demo token in magic URL: ${magicUrl}`);

  const { response, body } = await jsonRequest("/api/demo/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "validate", token: demoToken }),
  });
  assert(response.status === 200 && body?.ok === true && body.magic_link, `Demo magic-link validation failed: HTTP ${response.status} ${JSON.stringify(body)}`);

  const verifyResponse = await fetch(body.magic_link, { redirect: "manual" });
  const location = verifyResponse.headers.get("location");
  assert(location, `Supabase magic link did not redirect (HTTP ${verifyResponse.status})`);
  const redirected = new URL(location);
  const fragment = new URLSearchParams(redirected.hash.replace(/^#/, ""));
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  assert(accessToken && refreshToken, `Magic link redirect missing session tokens: ${location}`);

  const user = anon();
  const { error: sessionError } = await user.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (sessionError) throw new Error(`Magic-link session setup failed: ${sessionError.message}`);

  const { error: passwordError } = await user.auth.updateUser({ password: firstPassword });
  if (passwordError) throw new Error(`First password update failed: ${passwordError.message}`);

  const { data: current } = await user.auth.getSession();
  const currentToken = current.session?.access_token;
  assert(currentToken, "Session disappeared after first password update");

  const { response: markerResponse, body: markerBody } = await jsonRequest("/api/auth/clear-password-marker", {
    method: "POST",
    headers: { Authorization: `Bearer ${currentToken}` },
  });
  assert(markerResponse.status === 200 && markerBody?.ok === true, `Password marker clear failed: HTTP ${markerResponse.status} ${JSON.stringify(markerBody)}`);

  await user.auth.signOut();
  const login = anon();
  const { data: relogin, error: reloginError } = await login.auth.signInWithPassword({
    email: visitorEmail,
    password: firstPassword,
  });
  assert(!reloginError && relogin.session?.access_token, `Login with first password failed: ${reloginError?.message}`);
  await login.auth.signOut();
}

function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function purgePublicTraces() {
  const values = [...identities, ...userIds];
  const columns = await pg.query(`
    select c.table_name, c.column_name, c.data_type
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema=c.table_schema and t.table_name=c.table_name
    where c.table_schema='public'
      and t.table_type='BASE TABLE'
      and c.data_type in ('uuid','text','character varying','json','jsonb')
    order by c.table_name, c.ordinal_position
  `);

  const byTable = new Map<string, Array<{ column_name: string; data_type: string }>>();
  for (const row of columns.rows) {
    const list = byTable.get(row.table_name) ?? [];
    list.push(row);
    byTable.set(row.table_name, list);
  }

  for (let pass = 0; pass < 8; pass += 1) {
    let deleted = 0;
    for (const [table, cols] of byTable) {
      const clauses: string[] = [];
      const params: string[] = [];
      for (const col of cols) {
        const name = quoteIdent(col.column_name);
        if (col.data_type === "uuid") {
          for (const value of userIds) {
            params.push(value);
            clauses.push(`${name} = $${params.length}::uuid`);
          }
        } else {
          for (const value of values) {
            params.push(`%${value}%`);
            clauses.push(`${name}::text ILIKE $${params.length}`);
          }
        }
      }
      if (!clauses.length) continue;
      try {
        const result = await pg.query(`delete from public.${quoteIdent(table)} where ${clauses.join(" or ")}`, params);
        deleted += result.rowCount ?? 0;
      } catch {
        // Parent rows are retried after dependent rows disappear in later passes.
      }
    }
    if (deleted === 0) break;
  }
}

async function cleanupEverything() {
  await purgePublicTraces();
  for (const id of [...userIds]) {
    await service.auth.admin.deleteUser(id, false).catch(() => {});
  }
  await purgePublicTraces();

  const authCheck = await pg.query(
    `select id::text,email from auth.users where id = any($1::uuid[]) or lower(email) = any($2::text[])`,
    [[...userIds], [...identities].map((x) => x.toLowerCase())],
  );
  if (authCheck.rowCount) throw new Error(`Auth traces remain: ${JSON.stringify(authCheck.rows)}`);

  const remaining: Array<{ table: string; count: number }> = [];
  for (const email of identities) {
    const result = await pg.query(`
      select table_name, column_name
      from information_schema.columns
      where table_schema='public' and data_type in ('text','character varying','json','jsonb')
    `);
    for (const row of result.rows) {
      try {
        const q = await pg.query(
          `select count(*)::int as count from public.${quoteIdent(row.table_name)} where ${quoteIdent(row.column_name)}::text ILIKE $1`,
          [`%${email}%`],
        );
        if (q.rows[0]?.count > 0) remaining.push({ table: row.table_name, count: q.rows[0].count });
      } catch {
        // Ignore columns that cannot be cast or queried during the cleanup scan.
      }
    }
  }
  if (remaining.length) throw new Error(`Public traces remain: ${JSON.stringify(remaining)}`);
}

let failure: unknown = null;
try {
  await pg.connect();
  const { client: adminClient, token: adminToken } = await createTestAdmin();
  const { token: visitorToken, verificationUserId } = await createVerifiedVisitorSession();
  await submitDemoRequest(visitorToken, verificationUserId);
  const magicUrl = await acceptRequest(adminClient, adminToken);
  await activateMagicLinkAndSetPassword(magicUrl);
  console.log(JSON.stringify({ ok: true, request_id: requestId, user_id: productUserId, first_password_verified: true }));
} catch (error) {
  failure = error;
} finally {
  try {
    await cleanupEverything();
    console.log(JSON.stringify({ cleanup_verified: true, auth_traces: 0, public_email_traces: 0 }));
  } catch (cleanupError) {
    console.error(cleanupError);
    process.exitCode = 2;
  }
  await pg.end().catch(() => {});
}

if (failure) {
  console.error(failure);
  process.exit(1);
}
if (process.exitCode) process.exit(process.exitCode);