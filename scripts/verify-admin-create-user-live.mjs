#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.VITE_SUPABASE_URL.trim();
const anonKey = process.env.VITE_SUPABASE_ANON_KEY.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
const adminEmail = process.env.ADMIN_EMAIL.trim();
const adminPassword = process.env.ADMIN_PASSWORD;
const apiBaseUrl = (process.env.API_BASE_URL || "https://www.e-samba.com").replace(/\/$/, "");
const runMarker = `${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`;
const testEmail = `ci-provision-${runMarker}@example.com`.toLowerCase();

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 100) return null;
  }
  throw new Error("Recherche Auth interrompue: trop de pages utilisateur");
}

async function deleteBy(table, column, value) {
  if (!value) return;
  const { error } = await service.from(table).delete().eq(column, value);
  if (error) throw new Error(`Cleanup ${table}.${column}: ${error.message}`);
}

async function countBy(table, column, value) {
  if (!value) return 0;
  const { count, error } = await service
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw new Error(`Verification ${table}.${column}: ${error.message}`);
  return count ?? 0;
}

async function cleanup(userId) {
  const authUser = userId ? { id: userId } : await findAuthUserByEmail(testEmail);
  const id = authUser?.id ?? null;

  if (id) {
    await deleteBy("flotte_adhesions", "user_id", id);
    await deleteBy("admin_profiles", "user_id", id);
    await deleteBy("demo_sessions", "user_id", id);
    await deleteBy("demo_magic_links", "user_id", id);
    await deleteBy("demo_onboarding_logs", "user_id", id);
    await deleteBy("demo_expiration_log", "user_id", id);
    await deleteBy("demo_audit_logs", "user_id", id);
    await deleteBy("demo_profiles", "user_id", id);
    await deleteBy("onboarding_progress", "user_id", id);
    await deleteBy("notification_tokens", "user_id", id);
    await deleteBy("profils", "user_id", id);
  }

  await deleteBy("audit_logs", "target_email", testEmail);

  if (id) {
    const { error } = await service.auth.admin.deleteUser(id, false);
    if (error && !error.message.toLowerCase().includes("not found")) throw error;
  }

  const authRemaining = await findAuthUserByEmail(testEmail);
  const traces = [];
  const checks = [
    ["profils", "user_id", id],
    ["admin_profiles", "user_id", id],
    ["flotte_adhesions", "user_id", id],
    ["demo_profiles", "user_id", id],
    ["demo_sessions", "user_id", id],
    ["audit_logs", "target_email", testEmail],
  ];

  for (const [table, column, value] of checks) {
    const count = await countBy(table, column, value);
    if (count !== 0) traces.push({ table, column, count });
  }

  if (authRemaining || traces.length) {
    throw new Error(`Nettoyage incomplet: ${JSON.stringify({ auth_remaining: Boolean(authRemaining), traces })}`);
  }

  return { user_id: id, auth_remaining: 0, public_traces: [] };
}

let createdUserId = null;
let primaryError = null;
let cleanupError = null;

try {
  const { data: login, error: loginError } = await authClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (loginError || !login.session?.access_token) {
    throw new Error(`Connexion admin impossible: ${loginError?.message || "session_absente"}`);
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
      phone: "+237690000001",
      company_name: `CI Fleet ${runMarker}`,
      company_identifier: `CI-${runMarker}`,
      country_code: "CM",
      role: "organizer",
      platform_admin: false,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok !== true || !payload?.user_id) {
    throw new Error(`Creation echouee: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  createdUserId = payload.user_id;

  const { data: profile, error: profileError } = await service
    .from("profils")
    .select("user_id, full_name, phone")
    .eq("user_id", createdUserId)
    .maybeSingle();
  if (profileError || !profile) throw new Error(`Profil utilisateur absent apres creation: ${profileError?.message || "not_found"}`);

  const { data: createdAuth, error: createdAuthError } = await service.auth.admin.getUserById(createdUserId);
  if (createdAuthError || !createdAuth.user) throw new Error("Utilisateur Auth absent apres creation");
  if (createdAuth.user.app_metadata?.must_set_password !== true) {
    throw new Error("Le marqueur must_set_password n'est pas positionne");
  }

  console.log(JSON.stringify({ ok: true, created: true, user_id: createdUserId, email: testEmail }));
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
