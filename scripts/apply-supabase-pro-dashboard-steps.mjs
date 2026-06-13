#!/usr/bin/env node
/**
 * Applique automatiquement les étapes « dashboard » Supabase Pro lorsque les secrets sont disponibles.
 * Lit .env.local + Credential Manager Windows (token Supabase) + Vercel CLI.
 *
 * Usage : npm run apply:supabase-pro
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvWithLocalFallback } from "./_env-loader.js";
import { resolveSupabaseAccessToken } from "./_supabase-access-token.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PROD_REF = "zqxjvmejoktwlcqshnwi";
const INACTIVE_REF = "wdvpekljddxfdxpbyfgz";
const API = "https://api.supabase.com";

const EF_SECRET_KEYS = [
  "CRON_SECRET",
  "FCM_SERVER_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_VERIFY_TOKEN",
  "ORANGE_SMS_TOKEN",
];

const DEFAULT_RESEND_FROM = "billing@e-samba.com";

loadEnvWithLocalFallback(root);

let warnings = 0;

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function warn(msg) {
  console.log(`ATTENTION: ${msg}`);
  warnings += 1;
}

function apiHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...apiHeaders(token), ...init.headers },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body, text };
}

function isProjectRemovedResponse(res, body) {
  if (res.status === 404) return true;
  if (res.status === 400 && String(body?.message ?? "").includes("removed")) {
    return true;
  }
  return false;
}

async function verifyInactiveProjectDeleted(token) {
  const { res, body } = await apiFetch(token, `/v1/projects/${INACTIVE_REF}`);
  if (isProjectRemovedResponse(res, body)) {
    ok(`projet parasite ${INACTIVE_REF} déjà supprimé`);
    return;
  }
  if (res.ok) {
    warn(
      `projet parasite ${INACTIVE_REF} encore présent — suppression via dashboard ou: npx supabase projects delete ${INACTIVE_REF} --yes`,
    );
    return;
  }
  warn(`impossible de vérifier le projet inactif (HTTP ${res.status})`);
}

async function listSecretNames(token) {
  const { res, body } = await apiFetch(token, `/v1/projects/${PROD_REF}/secrets`);
  if (!res.ok) {
    throw new Error(`Liste secrets HTTP ${res.status}`);
  }
  return new Set(body.map((s) => s.name));
}

async function pushEdgeSecrets(token) {
  const existing = await listSecretNames(token);
  const toPush = [];
  const missingOptional = [];

  for (const key of EF_SECRET_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      toPush.push({ name: key, value });
      continue;
    }
    if (key === "RESEND_FROM_EMAIL" && !existing.has(key)) {
      toPush.push({ name: key, value: DEFAULT_RESEND_FROM });
      continue;
    }
    if (key === "CRON_SECRET" && !existing.has(key)) {
      const generated = randomBytes(32).toString("hex");
      toPush.push({ name: key, value: generated });
      ok("CRON_SECRET généré automatiquement (absent côté Supabase)");
      continue;
    }
    if (!existing.has(key)) {
      missingOptional.push(key);
    }
  }

  if (toPush.length === 0 && missingOptional.length > 0) {
    warn(
      `secrets EF manquants dans .env.local : ${missingOptional.join(", ")}`,
    );
    return;
  }

  if (toPush.length === 0) {
    ok("secrets EF déjà synchronisés côté Supabase");
    return;
  }

  const { res, text } = await apiFetch(token, `/v1/projects/${PROD_REF}/secrets`, {
    method: "POST",
    body: JSON.stringify(toPush),
  });

  if (!res.ok) {
    throw new Error(`Push secrets HTTP ${res.status}: ${String(text).slice(0, 300)}`);
  }

  ok(`${toPush.length} secret(s) EF synchronisé(s): ${toPush.map((s) => s.name).join(", ")}`);
}

async function configurePhoneAuth(token) {
  const accountSid =
    process.env.SMS_TWILIO_ACCOUNT_SID?.trim() ??
    process.env.TWILIO_ACCOUNT_SID?.trim();
  const messageServiceSid =
    process.env.SMS_TWILIO_MESSAGE_SERVICE_SID?.trim() ??
    process.env.TWILIO_MESSAGE_SERVICE_SID?.trim();
  const authToken =
    process.env.SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN?.trim() ??
    process.env.SMS_TWILIO_AUTH_TOKEN?.trim() ??
    process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!accountSid || !messageServiceSid || !authToken) {
    warn(
      "Phone Auth non configuré — définissez TWILIO_ACCOUNT_SID, TWILIO_MESSAGE_SERVICE_SID, TWILIO_AUTH_TOKEN dans .env.local",
    );
    return;
  }

  const { res, text } = await apiFetch(token, `/v1/projects/${PROD_REF}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify({
      external_phone_enabled: true,
      sms_provider: "twilio",
      sms_twilio_account_sid: accountSid,
      sms_twilio_message_service_sid: messageServiceSid,
      sms_twilio_auth_token: authToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`PATCH auth Phone HTTP ${res.status}: ${String(text).slice(0, 300)}`);
  }

  ok("Phone Auth Twilio activé via Management API");
}

function configureVercelSentry() {
  const dsn = process.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) {
    warn("VITE_SENTRY_DSN absent — créer le projet Sentry puis l'ajouter à .env.local ou Vercel");
    return;
  }

  const ls = spawnSync("npx", ["vercel", "env", "ls", "production"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });

  if (ls.status !== 0) {
    warn("Vercel CLI non authentifié — impossible de pousser VITE_SENTRY_DSN");
    return;
  }

  if (ls.stdout.includes("VITE_SENTRY_DSN")) {
    ok("VITE_SENTRY_DSN déjà présent sur Vercel Production");
    return;
  }

  const add = spawnSync(
    "npx",
    ["vercel", "env", "add", "VITE_SENTRY_DSN", "production"],
    {
      cwd: root,
      input: dsn,
      encoding: "utf8",
      shell: true,
    },
  );

  if (add.status !== 0) {
    warn("échec vercel env add VITE_SENTRY_DSN — voir sortie CLI");
    return;
  }

  ok("VITE_SENTRY_DSN ajouté sur Vercel Production — redéployer (npm run deploy:prebuilt)");
}

function printAlertsReminder() {
  console.log("\n--- Alertes Supabase (dashboard uniquement) ---");
  console.log(
    "https://supabase.com/dashboard/project/zqxjvmejoktwlcqshnwi/settings/integrations",
  );
  console.log("Configurer : disk > 85 %, EF 5xx (billing-lifecycle-cron, otp-send), DB unhealthy");
}

async function main() {
  console.log("Application des étapes Supabase Pro (automatisables)…\n");

  const token = resolveSupabaseAccessToken();

  await verifyInactiveProjectDeleted(token);
  await pushEdgeSecrets(token);
  await configurePhoneAuth(token);
  configureVercelSentry();
  printAlertsReminder();

  console.log("\nVérification finale…");
  const verify = spawnSync("node", ["scripts/verify-supabase-pro-readiness.mjs"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });

  process.exit(verify.status === 0 && warnings === 0 ? 0 : warnings > 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("ERREUR:", err.message);
  process.exit(1);
});
