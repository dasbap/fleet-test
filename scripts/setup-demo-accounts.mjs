#!/usr/bin/env node
/**
 * Provisionne les comptes démo E-Samba manquants (Auth + profils + adhésions + demo_profiles).
 *
 * Idempotent : crée uniquement ce qui manque, réinitialise les mots de passe connus.
 *
 * Requis : VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 *
 * Usage : npm run setup:demo-accounts
 *         node --env-file=.env.local scripts/setup-demo-accounts.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const DEMO_PASSWORD = "Demo2025!";

/** Même mapping que create-demo-organization-complete.sql (flottes réelles du projet). */
const DEMO_ACCOUNTS = [
  {
    email: "demo.organizer@esamba.test",
    fullName: "Organisateur démo",
    demoRole: "organizer",
    fleetKeys: ["starter", "pro", "entreprise"],
    adhesions: [
      { fleetKey: "starter", role: "organizer" },
      { fleetKey: "pro", role: "organizer" },
      { fleetKey: "entreprise", role: "organizer" },
    ],
  },
  {
    email: "demo.manager1@esamba.test",
    fullName: "Manager démo 1",
    demoRole: "manager",
    fleetKeys: ["starter"],
    adhesions: [{ fleetKey: "starter", role: "manager" }],
  },
  {
    email: "demo.manager2@esamba.test",
    fullName: "Manager démo 2",
    demoRole: "manager",
    fleetKeys: ["pro"],
    adhesions: [{ fleetKey: "pro", role: "manager" }],
  },
  {
    email: "demo.driver1@esamba.test",
    fullName: "Conducteur démo 1",
    demoRole: "driver",
    fleetKeys: ["starter"],
    adhesions: [{ fleetKey: "starter", role: "driver" }],
  },
  {
    email: "demo.driver2@esamba.test",
    fullName: "Conducteur démo 2",
    demoRole: "driver",
    fleetKeys: ["pro"],
    adhesions: [{ fleetKey: "pro", role: "driver" }],
  },
  {
    email: "demo.mechanic1@esamba.test",
    fullName: "Mécanicien démo 1",
    demoRole: "mechanic",
    fleetKeys: ["entreprise"],
    adhesions: [{ fleetKey: "entreprise", role: "mechanic" }],
  },
];

const FLEET_NAMES = {
  starter: "Flotte DEMO Starter",
  pro: "Flotte DEMO Pro",
  entreprise: "Flotte DEMO Entreprise",
};

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

function log(msg, kind = "") {
  const prefix =
    kind === "ok" ? "OK: " : kind === "err" ? "ERREUR: " : kind === "warn" ? "ATTENTION: " : "";
  console.log(prefix + msg);
}

/** Recherche un utilisateur par email via l’API Admin REST (contournement si listUsers échoue). */
async function findUserByEmail(url, serviceRoleKey, email) {
  const endpoint = new URL("/auth/v1/admin/users", url);
  endpoint.searchParams.set("page", "1");
  endpoint.searchParams.set("per_page", "1");
  endpoint.searchParams.set("filter", email);

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Admin users lookup (${email}) : ${res.status} ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const users = json.users ?? json;
  if (Array.isArray(users) && users.length > 0 && users[0].email === email) {
    return users[0];
  }
  return null;
}

async function ensureAuthUser(supabase, url, serviceRoleKey, email) {
  let user = null;
  try {
    user = await findUserByEmail(url, serviceRoleKey, email);
  } catch (e) {
    log(`Lookup ${email} : ${e.message} — tentative createUser`, "warn");
  }

  if (user) {
    // Ne pas forcer updateUser(password) si le compte existe déjà : Supabase peut
    // rejeter Demo2025! comme « mot de passe faible » alors que la connexion fonctionne.
    const anon = process.env.VITE_SUPABASE_ANON_KEY;
    if (anon) {
      const probe = createClient(url, anon);
      const { error: signErr } = await probe.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
      if (!signErr) {
        log(`Compte existant — connexion OK : ${email}`, "ok");
        return user.id;
      }
    }
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`${email} updateUser : ${error.message}`);
    log(`Compte existant — mot de passe synchronisé : ${email}`, "ok");
    return user.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: email.split(".")[1]?.split("@")[0] ?? email },
  });
  if (error) throw new Error(`${email} createUser : ${error.message}`);
  log(`Compte créé : ${email}`, "ok");
  return data.user.id;
}

async function resolveFleetIds(supabase) {
  const names = Object.values(FLEET_NAMES);
  const { data, error } = await supabase
    .from("flottes")
    .select("id, name")
    .in("name", names);

  if (error) throw new Error(`Flottes démo : ${error.message}`);

  const byName = new Map((data ?? []).map((f) => [f.name, f.id]));
  const fleets = {};
  for (const [key, name] of Object.entries(FLEET_NAMES)) {
    const id = byName.get(name);
    if (!id) {
      throw new Error(
        `Flotte « ${name} » introuvable. Exécutez supabase/scripts/setup/create-demo-organization-complete.sql`,
      );
    }
    fleets[key] = id;
  }
  return fleets;
}

async function upsertProfil(supabase, userId, fullName) {
  const { error } = await supabase.from("profils").upsert(
    { user_id: userId, full_name: fullName },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`profil ${userId} : ${error.message}`);
}

async function upsertAdhesion(supabase, userId, fleetId, role) {
  const { error } = await supabase.from("flotte_adhesions").upsert(
    { fleet_id: fleetId, user_id: userId, role, is_active: true },
    { onConflict: "fleet_id,user_id" },
  );
  if (error) throw new Error(`adhésion ${role} : ${error.message}`);
}

async function upsertDemoProfile(supabase, userId, demoRole, fleetId, email) {
  const { error } = await supabase.from("demo_profiles").upsert(
    {
      user_id: userId,
      demo_role: demoRole,
      fleet_id: fleetId,
      is_active: true,
      account_type: "permanent",
      email,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Provisionné par scripts/setup-demo-accounts.mjs",
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`demo_profile ${email} : ${error.message}`);
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    log("VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis", "err");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const fleetIds = await resolveFleetIds(supabase);
  log(`Flottes démo résolues : ${Object.keys(fleetIds).join(", ")}`, "ok");

  for (const acc of DEMO_ACCOUNTS) {
    const userId = await ensureAuthUser(supabase, url, serviceRoleKey, acc.email);
    await upsertProfil(supabase, userId, acc.fullName);

    for (const adh of acc.adhesions) {
      await upsertAdhesion(supabase, userId, fleetIds[adh.fleetKey], adh.role);
    }

    const primaryFleetId = fleetIds[acc.fleetKeys[0]];
    await upsertDemoProfile(supabase, userId, acc.demoRole, primaryFleetId, acc.email);
    log(`Profil + adhésions configurés : ${acc.email}`, "ok");
  }

  log("Tous les comptes démo sont provisionnés. Lancez : npm run verify:demo-accounts:ui", "ok");
}

main().catch((e) => {
  log(e?.message ?? String(e), "err");
  process.exit(1);
});
