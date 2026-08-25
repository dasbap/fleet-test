#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const DEMO_EMAILS = [
  "demo.organizer@esamba.test",
  "demo.manager1@esamba.test",
  "demo.manager2@esamba.test",
  "demo.driver1@esamba.test",
  "demo.driver2@esamba.test",
  "demo.mechanic1@esamba.test",
];

function parseEnvContent(content) {
  const normalized = content.replace(/^\uFEFF/, "");
  normalized.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return;
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}

function loadEnvLocal() {
  const candidatePaths = [join(root, ".env.local"), join(process.cwd(), ".env.local")];
  for (const envPath of candidatePaths) {
    if (!existsSync(envPath)) continue;
    parseEnvContent(readFileSync(envPath, "utf8"));
  }
}

loadEnvLocal();

function log(msg, kind = "") {
  const prefix =
    kind === "ok" ? "OK: " : kind === "err" ? "ERREUR: " : kind === "warn" ? "ATTENTION: " : "";
  console.log(prefix + msg);
}

function isLocalSupabaseUrl(value) {
  try {
    const url = new URL(value);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD?.trim() ?? "";
  if (password.length < 16) {
    throw new Error("DEMO_PASSWORD est requis et doit contenir au moins 16 caractères.");
  }
  return password;
}

function assertSafeTarget(url) {
  if (isLocalSupabaseUrl(url)) return;
  if (process.env.ALLOW_REMOTE_DEMO_PROVISIONING !== "true") {
    throw new Error(
      "Réinitialisation démo distante refusée. Définissez explicitement ALLOW_REMOTE_DEMO_PROVISIONING=true après vérification de la cible.",
    );
  }
}

async function findUserByEmailRest(url, serviceRoleKey, email) {
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
    throw new Error(`Admin lookup ${email} : ${res.status} ${body.slice(0, 120)}`);
  }

  const json = await res.json();
  const users = json.users ?? json;
  if (Array.isArray(users) && users.length > 0 && users[0].email === email) {
    return users[0];
  }
  return null;
}

async function collectUsersByEmail(supabase, url, serviceRoleKey, emails) {
  const found = new Map();

  for (const email of emails) {
    try {
      const user = await findUserByEmailRest(url, serviceRoleKey, email);
      if (user) found.set(email, user);
    } catch {
      continue;
    }
  }

  if (found.size === emails.length) return found;

  const targetSet = new Set(emails.filter((email) => !found.has(email)));
  const perPage = 200;
  let page = 1;

  while (targetSet.size > 0 && page <= 5000) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      if (found.size > 0) return found;
      throw error;
    }
    for (const user of data.users) {
      if (user.email && targetSet.has(user.email)) {
        found.set(user.email, user);
        targetSet.delete(user.email);
      }
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return found;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const missing = [];
    if (!url) missing.push("VITE_SUPABASE_URL ou SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    log(`Variables manquantes : ${missing.join(", ")}`, "err");
    process.exit(1);
  }

  assertSafeTarget(url);
  const demoPassword = requireDemoPassword();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const found = await collectUsersByEmail(supabase, url, serviceRoleKey, DEMO_EMAILS);
  let failures = 0;

  for (const email of DEMO_EMAILS) {
    const user = found.get(email);
    if (!user) {
      failures += 1;
      log(`Aucun utilisateur trouvé pour ${email}.`, "warn");
      continue;
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: demoPassword,
    });
    if (error) {
      failures += 1;
      log(`${email} : ${error.message}`, "err");
    } else {
      log(`Mot de passe réinitialisé pour ${email}`, "ok");
    }
  }

  if (failures > 0) {
    log(`${failures} compte(s) non mis à jour.`, "err");
    process.exit(1);
  }

  log("Tous les comptes démo présents ont été mis à jour avec le secret fourni par l’environnement.", "ok");
}

main().catch((e) => {
  log(e?.message ?? String(e), "err");
  process.exit(1);
});
