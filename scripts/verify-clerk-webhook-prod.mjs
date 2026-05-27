/**
 * Vérification minimale du webhook Clerk en production (sans secret).
 * URL canonique : https://www.e-samba.com (ne pas valider via *-atipik.vercel.app — protection 401).
 * Attendu : 405 Method Not Allowed + Content-Type text/plain (handler Vercel, pas le HTML SPA).
 *
 * Usage : node scripts/verify-clerk-webhook-prod.mjs
 *         CLERK_WEBHOOK_URL=https://www.e-samba.com/api/webhooks/clerk node scripts/verify-clerk-webhook-prod.mjs
 */

const url =
  process.env.CLERK_WEBHOOK_URL ?? "https://www.e-samba.com/api/webhooks/clerk";

const getRes = await fetch(url, { method: "GET", redirect: "manual" });
const getCt = getRes.headers.get("content-type") ?? "";
const getOk = getRes.status === 405 && getCt.includes("text/plain");
if (!getOk) {
  console.error("[verify-clerk-webhook-prod] GET inattendu", {
    status: getRes.status,
    "content-type": getCt,
  });
  process.exit(1);
}

const postRes = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
  redirect: "manual",
});
const postOk = postRes.status === 401;
if (!postOk) {
  console.error("[verify-clerk-webhook-prod] POST sans Svix inattendu", { status: postRes.status });
  process.exit(1);
}

console.log("[verify-clerk-webhook-prod] OK", {
  url,
  get: { status: getRes.status, "content-type": getCt },
  postSansSvix: { status: postRes.status },
});
