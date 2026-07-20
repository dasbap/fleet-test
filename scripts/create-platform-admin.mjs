#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.ADMIN_EMAIL || process.argv[2] || "").trim().toLowerCase();
const password = (process.env.ADMIN_PASSWORD || process.argv[3] || "").trim();
const fullName = (process.env.ADMIN_FULL_NAME || process.argv[4] || "Administrateur E-Samba").trim();

if (!url || !key || !email) {
  console.error(
    "Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... node --env-file=.env.local scripts/create-platform-admin.mjs",
  );
  console.error("Variables requises: VITE_SUPABASE_URL/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function findUserByEmail(targetEmail) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

let user = await findUserByEmail(email);

if (!user) {
  if (!password) {
    console.error("ADMIN_PASSWORD requis pour creer un nouvel utilisateur admin.");
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
    notes: "Bootstrap platform admin",
  },
  { onConflict: "user_id" },
);
if (adminProfileError) throw adminProfileError;

console.log(JSON.stringify({ ok: true, user_id: user.id, email }, null, 2));
