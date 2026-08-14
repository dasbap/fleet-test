#!/usr/bin/env node
/**
 * Audit minimal des variables Vercel liees au BFF facturation same-origin.
 * Usage : node scripts/_audit-vercel-prod-env.mjs
 * Necessite `vercel env pull` ou variables deja presentes dans process.env.
 */
const keys = [
  "VITE_SUPABASE_URL",
  "APP_URL",
  "BACKEND_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYMENT_WEBHOOK_SECRET",
  "PAYMENTS_WEBHOOK_SECRET",
  "NOTCH_PAY_API_KEY",
  "NOTCH_API_KEY",
  "NOTCH_PAY_WEBHOOK_SECRET",
  "NOTCH_WEBHOOK_SECRET",
  "CINETPAY_WEBHOOK_SECRET",
];

const map = new Map(keys.map((k) => [k, process.env[k]]));

console.log("=== Audit env BFF / facturation ===\n");
for (const k of keys) {
  const v = map.get(k);
  console.log(`${k}: ${v ? "(defini)" : "(absent)"}`);
}

const hasServiceRole = Boolean(map.get("SUPABASE_SERVICE_ROLE_KEY")?.trim());
const hasWebhook =
  Boolean(map.get("PAYMENT_WEBHOOK_SECRET")?.trim()) ||
  Boolean(map.get("PAYMENTS_WEBHOOK_SECRET")?.trim()) ||
  Boolean(map.get("NOTCH_PAY_WEBHOOK_SECRET")?.trim()) ||
  Boolean(map.get("NOTCH_WEBHOOK_SECRET")?.trim()) ||
  Boolean(map.get("CINETPAY_WEBHOOK_SECRET")?.trim());

if (!hasServiceRole || !hasWebhook) {
  console.warn(
    "\nAttention : definir SUPABASE_SERVICE_ROLE_KEY et au moins un secret webhook dans le projet Vercel www.",
  );
} else {
  console.log("\nBFF /api : secrets backend presents dans cet environnement.");
}

console.log("\nWebhook PSP attendu : https://www.e-samba.com/api/webhooks/payment");
