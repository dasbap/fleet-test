#!/usr/bin/env node
/**
 * Injecte les secrets Edge Functions Supabase depuis .env.local (jamais commités).
 * Prérequis : supabase login, SUPABASE_ACCESS_TOKEN ou token Credential Manager Windows.
 *
 * Variables lues (toutes optionnelles — seules les définies sont poussées) :
 *   CRON_SECRET, FCM_SERVER_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL,
 *   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET,
 *   WHATSAPP_VERIFY_TOKEN, ORANGE_SMS_TOKEN
 *
 * Usage : npm run secrets:supabase-edge
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvWithLocalFallback } from "./_env-loader.js";
import { resolveSupabaseAccessToken } from "./_supabase-access-token.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PROJECT_REF = "zqxjvmejoktwlcqshnwi";

const SECRET_KEYS = [
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

loadEnvWithLocalFallback(root);

const toSet = SECRET_KEYS.filter((k) => {
  const v = process.env[k];
  return typeof v === "string" && v.trim().length > 0;
});

if (toSet.length === 0) {
  console.log(
    "Aucun secret à pousser. Définissez les variables dans .env.local puis relancez.",
  );
  console.log("Référence : docs/supabase-pro-validation.md §2");
  process.exit(0);
}

const payload = toSet.map((k) => ({ name: k, value: process.env[k].trim() }));

console.log(`Poussée de ${toSet.length} secret(s) vers ${PROJECT_REF}…`);

async function main() {
  const token = resolveSupabaseAccessToken();
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    console.error(`\nÉchec HTTP ${res.status}: ${text.slice(0, 400)}`);
    process.exit(1);
  }

  console.log(
    "OK: secrets Edge Functions mis à jour:",
    toSet.join(", "),
  );
}

main().catch((err) => {
  console.error("\nÉchec:", err.message);
  process.exit(1);
});
