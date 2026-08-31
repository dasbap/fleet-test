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
  if (!process.env[key]?.trim()) throw new Error(`Variable requise absente: ${key}`);
}

const databaseUrl = resolveDatabaseUrl(process.env);
if (!databaseUrl) throw new Error("Connexion PostgreSQL de nettoyage absente");

const supabaseUrl = process.env.VITE_SUPABASE_URL.trim();
const anonKey = process.env.VITE_SUPABASE_ANON_KEY.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
const adminEmail = process.env.ADMIN_EMAIL.trim();
const adminPassword = process.env.ADMIN_PASSWORD;
const apiBaseUrl = (process.env.API_BASE_URL || "https://www.e-samba.com").replace(/\/$/, "");
const runMarker = `${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`;
const testEmail = `ci-provision-${runMarker}@example.com`.toLowerCase();

const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const pg = new Client(buildPgClientConfig({ databaseUrl, env: { ...process.env, SUPABASE_DB_SSL_NO_VERIFY: "1" } }));

async function findAuthUserByEmail(email) {
  const result = await pg.query("select id::text from auth.users where lower(email)=lower($1) limit 1", [email]);
  return result.rows[0]?.id || null;
}

async function cleanup(userId) {
  if (!userId) userId = await findAuthUserByEmail(testEmail);
  if (userId) {
    await pg.query("delete from public.flotte_adhesions where user_id=$1::uuid", [userId]).catch(() => {});
    await pg.query("delete from public.profils where user_id=$1::uuid", [userId]).catch(() => {});
    await pg.query("delete from public.admin_profiles where user_id=$1::uuid", [userId]).catch(() => {});
    await pg.query("delete from public.demo_profiles where user_id=$1::uuid", [userId]).catch(() => {});
    const { error } = await adminClient.auth.admin.deleteUser(userId, false);
    if (error) await pg.query("delete from auth.users where id=$1::uuid", [userId]);
  }
  const remain = await pg.query("select count(*)::int as count from auth.users where lower(email)=lower($1)", [testEmail]);
  if ((remain.rows[0]?.count || 0) !== 0) throw new Error("Nettoyage incomplet: utilisateur Auth encore present");
}

let createdUserId = null;
let primaryError = null;
try {
  await pg.connect();
  const { data: login, error: loginError } = await authClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (loginError || !login.session?.access_token) throw new Error(`Connexion admin impossible: ${loginError?.message || "session_absente"}`);

  const { data: isAdmin, error: adminCheckError } = await authClient.rpc("is_platform_admin");
  if (adminCheckError || isAdmin !== true) throw new Error("Compte non reconnu comme admin plateforme");

  const response = await fetch(`${apiBaseUrl}/api/admin/create-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.session.access_token}` },
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
    throw new Error(`Creation echouee: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  createdUserId = payload.user_id;

  const profile = await pg.query("select user_id::text from public.profils where user_id=$1::uuid limit 1", [createdUserId]);
  if (!profile.rowCount) throw new Error("Profil utilisateur absent apres creation");

  console.log(JSON.stringify({ ok: true, created: true, user_id: createdUserId, email: testEmail }));
} catch (error) {
  primaryError = error;
} finally {
  try { await cleanup(createdUserId); } catch (cleanupError) {
    console.error(cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
    process.exitCode = 2;
  }
  await authClient.auth.signOut().catch(() => {});
  await pg.end().catch(() => {});
}

if (primaryError) {
  console.error(primaryError instanceof Error ? primaryError.message : String(primaryError));
  process.exit(1);
}
if (process.exitCode) process.exit(process.exitCode);
console.log(JSON.stringify({ cleanup_verified: true }));
