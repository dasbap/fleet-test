#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Variable requise absente: ${key}`);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL.trim();
const anonKey = process.env.VITE_SUPABASE_ANON_KEY.trim();
const adminEmail = process.env.ADMIN_EMAIL.trim();
const adminPassword = process.env.ADMIN_PASSWORD;
const apiBaseUrl = (process.env.API_BASE_URL || "https://www.e-samba.com").replace(/\/$/, "");
const runMarker = `${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`;
const testEmail = `ci-provision-${runMarker}@example.com`.toLowerCase();

const client = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let createdUserId = null;
let adminUserId = null;
let primaryError = null;
let cleanupError = null;

async function listDemoSessions() {
  const { data, error } = await client.rpc("admin_list_demo_sessions", {
    p_active_only: false,
  });
  if (error) throw new Error(`admin_list_demo_sessions: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

async function verifyDeleted() {
  const sessions = await listDemoSessions();
  const stale = sessions.find(
    (row) => row?.user_id === createdUserId || String(row?.email || "").toLowerCase() === testEmail,
  );
  if (stale) throw new Error(`Nettoyage incomplet: session demo restante pour ${testEmail}`);
}

async function cleanup() {
  if (!createdUserId || !adminUserId) return;
  const { data, error } = await client.rpc("delete_demo_account", {
    p_user_id: createdUserId,
    p_deleted_by: adminUserId,
    p_reason: `CI cleanup ${runMarker}`,
  });
  if (error) throw new Error(`delete_demo_account: ${error.message}`);
  if (!data?.ok) throw new Error(`delete_demo_account a retourne ${JSON.stringify(data)}`);
  await verifyDeleted();
}

try {
  const { data: login, error: loginError } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (loginError || !login.session?.access_token || !login.user?.id) {
    throw new Error(`Connexion admin impossible: ${loginError?.message || "session_absente"}`);
  }
  adminUserId = login.user.id;

  const { data: isAdmin, error: adminCheckError } = await client.rpc("is_platform_admin");
  if (adminCheckError || isAdmin !== true) {
    throw new Error(`Compte non reconnu comme admin plateforme: ${adminCheckError?.message || String(isAdmin)}`);
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/create-prospect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${login.session.access_token}`,
    },
    body: JSON.stringify({
      email: testEmail,
      full_name: `CI Prospect ${runMarker}`,
      company_name: `CI Fleet ${runMarker}`,
      phone: "+237690000001",
      company_identifier: `CI-${runMarker}`,
      country_code: "CM",
      account_type: "prospect",
      trial_days: 1,
      send_email: false,
      permanent_access: false,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok !== true || !payload?.user_id) {
    throw new Error(`Creation temporaire echouee: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  createdUserId = payload.user_id;

  const sessions = await listDemoSessions();
  const session = sessions.find((row) => row?.user_id === createdUserId);
  if (!session) throw new Error("Compte temporaire absent de admin_list_demo_sessions");
  if (String(session.email || "").toLowerCase() !== testEmail) {
    throw new Error("Email du compte temporaire incoherent");
  }
  if (session.is_active !== true) throw new Error("Compte temporaire cree mais inactif");

  console.log(JSON.stringify({
    ok: true,
    created: true,
    user_id: createdUserId,
    email: testEmail,
    account_type: session.account_type,
  }));
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanup();
    if (createdUserId) {
      console.log(JSON.stringify({ cleanup_verified: true, user_id: createdUserId }));
    }
  } catch (error) {
    cleanupError = error;
  }
  await client.auth.signOut().catch(() => {});
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
