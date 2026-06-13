#!/usr/bin/env node
/**
 * Vérification opérationnelle plan Supabase Pro — E-SAMBA prod.
 * Usage : node scripts/verify-supabase-pro-readiness.mjs [--otp-only] [--vercel-sentry]
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvWithLocalFallback } from "./_env-loader.js";
import { resolveSupabaseAccessToken } from "./_supabase-access-token.mjs";

const CRITICAL_EF_SECRETS = [
  "CRON_SECRET",
  "FCM_SERVER_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PROD_REF = "zqxjvmejoktwlcqshnwi";
const PROD_URL = `https://${PROD_REF}.supabase.co`;
const INACTIVE_REF = "wdvpekljddxfdxpbyfgz";
const ORG_ID = "viwjsaoiigwrwttmbpwl";

const args = new Set(process.argv.slice(2));
const otpOnly = args.has("--otp-only");
const vercelSentryOnly = args.has("--vercel-sentry");

loadEnvWithLocalFallback(root);

const anonKey =
  process.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeGp2bWVqb2t0d2xjcXNobndpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDYwOTcsImV4cCI6MjA4NTUyMjA5N30._GVkJhjLwNDKWyUk-eVcNjLkMHFmYU5p_ArGVEcRYl8";

let failed = 0;

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function warn(msg) {
  console.log(`ATTENTION: ${msg}`);
}

function err(msg) {
  console.log(`ERREUR: ${msg}`);
  failed += 1;
}

async function probeOtpSend() {
  const res = await fetch(`${PROD_URL}/functions/v1/otp-send`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone: "+237600000000" }),
  });

  let body;
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (res.status === 404) {
    err("otp-send introuvable (404) — déployer via npm run deploy:edge-functions");
    return;
  }

  if (res.status === 400 && body.reason === "invalid_phone") {
    ok("otp-send répond (validation numéro)");
    return;
  }

  if (res.status === 429 && body.reason === "rate_limited") {
    ok("otp-send répond (rate limit actif)");
    return;
  }

  if (res.status === 502 && body.reason === "provider_error") {
    warn(
      "otp-send ACTIVE mais provider Phone Auth non configuré (Dashboard → Auth → Phone)",
    );
    return;
  }

  if (res.ok && body.ok === true) {
    ok("otp-send : OTP envoyé — provider opérationnel");
    return;
  }

  warn(`otp-send réponse inattendue : HTTP ${res.status} ${JSON.stringify(body)}`);
}

async function probeBillingCron() {
  const res = await fetch(`${PROD_URL}/functions/v1/billing-lifecycle-cron`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: "__probe__" }),
  });

  if (res.status === 401) {
    ok("billing-lifecycle-cron ACTIVE (auth CRON_SECRET requise)");
    return;
  }

  if (res.status === 404) {
    err("billing-lifecycle-cron introuvable");
    return;
  }

  warn(`billing-lifecycle-cron : HTTP ${res.status}`);
}

function checkVercelSentry() {
  const result = spawnSync("npx", ["vercel", "env", "ls", "production"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });

  if (result.status !== 0) {
    warn("Impossible de lister Vercel env (vercel login requis)");
    return;
  }

  if (result.stdout.includes("VITE_SENTRY_DSN")) {
    ok("VITE_SENTRY_DSN présent sur Vercel Production");
    return;
  }

  warn(
    "VITE_SENTRY_DSN absent de Vercel Production — voir docs/supabase-pro-validation.md §4",
  );
}

async function checkInactiveProject() {
  try {
    const token = resolveSupabaseAccessToken();
    const res = await fetch(`https://api.supabase.com/v1/projects/${INACTIVE_REF}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const removed =
      res.status === 404 ||
      (res.status === 400 && String(body?.message ?? "").includes("removed"));
    if (removed) {
      ok(`projet parasite ${INACTIVE_REF} supprimé`);
      return;
    }
    if (res.ok) {
      warn(`projet parasite ${INACTIVE_REF} encore présent — npm run apply:supabase-pro`);
      return;
    }
    warn(`vérification projet inactif : HTTP ${res.status}`);
  } catch {
    warn("token Supabase indisponible — vérification projet inactif ignorée");
  }
}

async function checkEdgeSecrets() {
  try {
    const token = resolveSupabaseAccessToken();
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROD_REF}/secrets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      warn(`impossible de lister les secrets EF (HTTP ${res.status})`);
      return;
    }
    const names = new Set((await res.json()).map((s) => s.name));
    const missing = CRITICAL_EF_SECRETS.filter((k) => !names.has(k));
    if (missing.length === 0) {
      ok("secrets EF critiques présents (CRON, FCM, Resend)");
      return;
    }
    warn(`secrets EF manquants : ${missing.join(", ")} — npm run apply:supabase-pro après .env.local`);
  } catch {
    warn("token Supabase indisponible — vérification secrets EF ignorée");
  }
}

function printConstants() {
  console.log("\n--- Référence plan Pro ---");
  console.log(`Organisation : ${ORG_ID} (plan pro attendu)`);
  console.log(`Projet prod   : ${PROD_REF} (ACTIVE_HEALTHY)`);
  console.log(`Doc           : docs/supabase-pro-validation.md\n`);
}

async function main() {
  if (vercelSentryOnly) {
    checkVercelSentry();
    process.exit(failed > 0 ? 1 : 0);
  }

  if (otpOnly) {
    await probeOtpSend();
    process.exit(failed > 0 ? 1 : 0);
  }

  printConstants();
  await checkInactiveProject();
  await checkEdgeSecrets();
  await probeOtpSend();
  await probeBillingCron();
  checkVercelSentry();

  if (!existsSync(join(root, "docs", "supabase-backups-checklist.md"))) {
    err("Checklist backups manquante");
  } else {
    ok("Checklist backups documentée");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
