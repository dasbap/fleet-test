#!/usr/bin/env node
/**
 * Vérification push Capacitor + FCM avant / après injection FCM_SERVER_KEY.
 *
 * Usage :
 *   npm run verify:fcm
 *   npm run verify:fcm -- --probe-send     # envoi test send-notification (JWT requis)
 *   npm run verify:fcm -- --expect-configured  # après injection (500 → 200 attendu)
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadEnvWithLocalFallback } from "./_env-loader.js";
import { resolveSupabaseAccessToken } from "./_supabase-access-token.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PROD_REF = "zqxjvmejoktwlcqshnwi";
const PROD_URL = `https://${PROD_REF}.supabase.co`;
const GOOGLE_SERVICES = join(root, "android", "app", "google-services.json");

const args = new Set(process.argv.slice(2));
const probeSend = args.has("--probe-send");
const expectConfigured = args.has("--expect-configured");

loadEnvWithLocalFallback(root);

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

async function checkFcmSecretOnSupabase() {
  try {
    const token = resolveSupabaseAccessToken();
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROD_REF}/secrets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      warn(`impossible de lister les secrets Supabase (HTTP ${res.status})`);
      return false;
    }
    const names = new Set((await res.json()).map((s) => s.name));
    if (names.has("FCM_SERVER_KEY")) {
      ok("FCM_SERVER_KEY présent sur Supabase Edge Functions");
      return true;
    }
    if (expectConfigured) {
      err("FCM_SERVER_KEY absent sur Supabase (attendu après injection)");
    } else {
      warn("FCM_SERVER_KEY absent sur Supabase (normal avant injection)");
    }
    return false;
  } catch (e) {
    warn(`vérification secret FCM ignorée: ${e.message}`);
    return false;
  }
}

function checkGoogleServicesJson() {
  if (!existsSync(GOOGLE_SERVICES)) {
    err("android/app/google-services.json introuvable");
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(GOOGLE_SERVICES, "utf8"));
  } catch {
    err("google-services.json invalide (JSON)");
    return;
  }

  const projectId = parsed?.project_info?.project_id ?? "";
  const raw = readFileSync(GOOGLE_SERVICES, "utf8");

  if (projectId === "esamba-flotte-debug" || raw.includes("DEBUG_KEY_PLACEHOLDER")) {
    err("google-services.json encore en mode placeholder debug");
    return;
  }

  if (projectId !== "taxis-flotte") {
    warn(`project_id inattendu: ${projectId} (attendu taxis-flotte)`);
  } else {
    ok(`google-services.json project_id=${projectId}`);
  }

  const clients = parsed?.client ?? [];
  const android = clients.find(
    (c) => c?.client_info?.android_client_info?.package_name === "com.esamba.flotte",
  );
  if (!android) {
    err("package com.esamba.flotte absent de google-services.json");
    return;
  }

  const appId = android.client_info?.mobilesdk_app_id ?? "";
  if (
    !appId ||
    appId.includes("REPLACE") ||
    appId.includes("000000000000") ||
    appId.includes("PLACEHOLDER")
  ) {
    warn(
      "mobilesdk_app_id Android incomplet — télécharger google-services.json depuis Firebase Console (app Android com.esamba.flotte)",
    );
  } else {
    ok("mobilesdk_app_id Android configuré");
  }
}

function runUnitTests() {
  const result = spawnSync(
    "npm",
    ["test", "--", "src/test/push-notification.service.test.ts", "--run"],
    { cwd: root, encoding: "utf8", shell: true },
  );
  if (result.status === 0) {
    ok("tests unitaires mapPushDataToDeepLinkPayload");
  } else {
    err("tests unitaires push en échec");
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
}

async function getUserJwt() {
  const email =
    process.env.PLAYWRIGHT_TEST_EMAIL?.trim() ??
    process.env.TEST_INTEGRATION_EMAIL?.trim();
  const password =
    process.env.PLAYWRIGHT_TEST_PASSWORD?.trim() ??
    process.env.TEST_INTEGRATION_PASSWORD?.trim();
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!anonKey) {
    return null;
  }

  if (!email || !password) {
    return null;
  }

  const res = await fetch(`${PROD_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) return null;
  const body = await res.json();
  return body.access_token ?? null;
}

async function probeSendNotification(fcmConfigured) {
  const jwt = await getUserJwt();
  if (!jwt) {
    warn(
      "sonde send-notification ignorée — définir PLAYWRIGHT_TEST_* ou TEST_INTEGRATION_* + VITE_SUPABASE_ANON_KEY",
    );
    return;
  }

  let userId;
  try {
    const parts = jwt.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    userId = payload.sub;
  } catch {
    warn("impossible d'extraire sub du JWT");
    return;
  }

  const testUserId = process.env.TEST_FCM_USER_ID?.trim() || userId;

  const res = await fetch(`${PROD_URL}/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: process.env.VITE_SUPABASE_ANON_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: { userIds: [testUserId] },
      notification: {
        title: "Test E-Samba FCM",
        body: "Vérification push Capacitor",
        data: { category: "critical_alert", alert_id: "verify-fcm-probe" },
      },
    }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 300) };
  }

  if (!fcmConfigured && !expectConfigured) {
    if (res.status === 500 && String(text).includes("FCM")) {
      ok("send-notification : 500 FCM non configuré (attendu avant injection)");
      return;
    }
    if (res.status === 400 && String(text).includes("token")) {
      ok("send-notification : auth OK, aucun token device (enregistrer sur device d'abord)");
      return;
    }
    warn(`send-notification avant injection : HTTP ${res.status} ${text.slice(0, 200)}`);
    return;
  }

  if (expectConfigured || probeSend) {
    if (res.ok) {
      ok(`send-notification : HTTP ${res.status} (envoi FCM déclenché)`);
      return;
    }
    if (res.status === 400 && String(text).toLowerCase().includes("token")) {
      warn(
        "send-notification : FCM configuré mais aucun token dans notification_tokens pour cet utilisateur — tester sur device",
      );
      return;
    }
    err(`send-notification après injection : HTTP ${res.status} ${text.slice(0, 200)}`);
  }
}

async function probeFcmLegacyKey(key) {
  if (!key?.trim()) return;

  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${key.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registration_ids: ["__verify_fcm_probe_invalid_token__"],
      dry_run: true,
    }),
  });

  const text = await res.text();

  if (res.status === 401 || text.includes("Authentication")) {
    err("FCM_SERVER_KEY rejetée par Google (401)");
    return;
  }

  if (res.status === 404) {
    warn(
      "FCM legacy HTTP 404 — API peut être désactivée sur le projet Google ; envisager migration FCM v1",
    );
    return;
  }

  ok(`clé FCM acceptée par Google (HTTP ${res.status})`);
}

async function checkNotificationTokensInDb() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const url = process.env.VITE_SUPABASE_URL?.trim() || PROD_URL;

  if (!serviceKey) {
    warn("SUPABASE_SERVICE_ROLE_KEY absent — comptage notification_tokens ignoré");
    return;
  }

  const res = await fetch(
    `${url}/rest/v1/notification_tokens?select=platform&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "count=exact",
      },
    },
  );

  const range = res.headers.get("content-range") ?? "";
  const match = range.match(/\/(\d+)$/);
  const total = match ? Number(match[1]) : null;

  if (total === null) {
    warn("impossible de compter notification_tokens");
    return;
  }

  if (total > 0) {
    ok(`${total} token(s) dans notification_tokens`);
  } else {
    warn(
      "aucun token dans notification_tokens — lancer l'app Capacitor, accepter notifications (voir docs/push-notifications-capacitor.md)",
    );
  }
}

async function main() {
  console.log("--- Vérification push Capacitor + FCM ---\n");

  checkGoogleServicesJson();
  runUnitTests();

  const fcmOnSupabase = await checkFcmSecretOnSupabase();

  const localFcmKey = process.env.FCM_SERVER_KEY?.trim();
  if (localFcmKey) {
    ok("FCM_SERVER_KEY défini dans .env.local");
    if (localFcmKey.startsWith("AIza")) {
      err("FCM_SERVER_KEY ressemble à une apiKey Web (AIza…) — utiliser la clé serveur legacy AAAA…");
    } else if (!localFcmKey.startsWith("AAAA")) {
      warn("FCM_SERVER_KEY ne commence pas par AAAA — vérifier la clé serveur Firebase Cloud Messaging");
    }
    if (probeSend || expectConfigured || args.has("--probe-key")) {
      await probeFcmLegacyKey(localFcmKey);
    }
  } else if (!expectConfigured) {
    warn("FCM_SERVER_KEY absent de .env.local");
  }

  if (process.env.GOOGLE_SERVICES_JSON_PATH?.trim()) {
    ok("GOOGLE_SERVICES_JSON_PATH défini — npm run install:google-services");
  }

  await checkNotificationTokensInDb();

  if (probeSend || expectConfigured || !fcmOnSupabase) {
    await probeSendNotification(fcmOnSupabase);
  }

  console.log("\nRéférence : docs/push-notifications-capacitor.md");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
