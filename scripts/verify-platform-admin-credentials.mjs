#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const accounts = [
  {
    label: "admin",
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    fullName: process.env.ADMIN_FULL_NAME,
    role: "admin",
  },
  {
    label: "super_admin",
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    fullName: process.env.SUPER_ADMIN_FULL_NAME,
    role: "super_admin",
  },
].filter((account) => account.email && account.password);

if (!url || !anonKey || !serviceRoleKey) {
  console.error(
    "Variables requises: VITE_SUPABASE_URL/SUPABASE_URL, VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

if (accounts.length === 0) {
  console.error("Aucun compte admin a verifier dans les variables d'environnement.");
  process.exit(1);
}

const service = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const checks = [];

for (const account of accounts) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: sessionData, error: signInError } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });

  const user = sessionData.user;
  checks.push({
    check: `${account.label}_password_login`,
    ok: !signInError && Boolean(user),
    email: account.email,
    user_id: user?.id ?? null,
  });

  if (!user) continue;

  const { data: isPlatformAdmin, error: platformError } = await client.rpc("is_platform_admin");
  checks.push({
    check: `${account.label}_is_platform_admin`,
    ok: !platformError && isPlatformAdmin === true,
  });

  if (account.role === "super_admin") {
    const { data: isSuperAdmin, error: superAdminError } = await client.rpc(
      "is_platform_super_admin",
    );
    checks.push({
      check: "super_admin_is_platform_super_admin",
      ok: !superAdminError && isSuperAdmin === true,
    });
  }

  const { data: profile, error: profileError } = await service
    .from("profils")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  checks.push({
    check: `${account.label}_profile_full_name`,
    ok: !profileError && profile?.full_name === account.fullName,
    full_name: profile?.full_name ?? null,
  });

  const { data: adminProfile, error: adminProfileError } = await service
    .from("admin_profiles")
    .select("internal_role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  checks.push({
    check: `${account.label}_admin_profile_role`,
    ok:
      !adminProfileError &&
      adminProfile?.internal_role === account.role &&
      adminProfile?.is_active === true,
    role: adminProfile?.internal_role ?? null,
    is_active: adminProfile?.is_active ?? null,
  });

  const { data: demoRows, error: demoError } = await service
    .from("demo_profiles")
    .select("user_id")
    .eq("user_id", user.id);
  checks.push({
    check: `${account.label}_not_in_demo_profiles`,
    ok: !demoError && (demoRows?.length ?? 0) === 0,
    demo_rows: demoRows?.length ?? null,
  });

  await client.auth.signOut();
}

const failed = checks.filter((check) => !check.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
