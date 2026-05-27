#!/usr/bin/env node
/**
 * Audit minimal des variables Vercel liées au BFF facturation.
 * Usage : node scripts/_audit-vercel-prod-env.mjs
 * (nécessite `vercel env pull` ou variables déjà dans process.env)
 */
const keys = [
  "VITE_API_BASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYMENT_WEBHOOK_SECRET",
  "PAYMENTS_WEBHOOK_SECRET",
  "NOTCH_WEBHOOK_SECRET",
  "CINETPAY_WEBHOOK_SECRET",
];

const map = new Map(keys.map((k) => [k, process.env[k]]));

console.log("=== Audit env BFF / facturation ===\n");
for (const k of keys) {
  const v = map.get(k);
  console.log(`${k}: ${v ? "(défini)" : "(absent)"}`);
}

const bff = (map.get("VITE_API_BASE_URL") ?? "").trim();
const pointsToApi = bff.includes("api.e-samba.com");

if (bff) {
  console.log(`\nVITE_API_BASE_URL = ${bff}`);
  if (pointsToApi) {
    const hasServiceRole = Boolean(map.get("SUPABASE_SERVICE_ROLE_KEY")?.trim());
    const hasWebhook =
      Boolean(map.get("PAYMENT_WEBHOOK_SECRET")?.trim()) ||
      Boolean(map.get("PAYMENTS_WEBHOOK_SECRET")?.trim()) ||
      Boolean(map.get("NOTCH_WEBHOOK_SECRET")?.trim()) ||
      Boolean(map.get("CINETPAY_WEBHOOK_SECRET")?.trim());
  if (!hasServiceRole || !hasWebhook) {
      console.warn(
        "\n⚠️  BFF api.e-samba.com : sur le projet API Vercel, définir SUPABASE_SERVICE_ROLE_KEY et au moins un secret webhook.",
      );
    } else {
      console.log("\n✓ BFF api.e-samba.com : secrets backend présents dans cet environnement.");
    }
  } else {
    console.log(
      "\n⚠️  VITE_API_BASE_URL défini mais ne pointe pas vers api.e-samba.com — vérifier le déploiement du BFF.",
    );
  }
} else {
  console.log("\n✓ VITE_API_BASE_URL absent → facturation/MoMo via client Supabase (attendu sur www seul).");
}

console.log("\nWebhook PSP attendu : https://api.e-samba.com/webhooks/payment");
