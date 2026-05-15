/**
 * E2E prod : POST signé Svix → /api/webhooks/clerk → ligne clerk_webhook_events.
 * Nécessite CLERK_WEBHOOK_SECRET (identique à Vercel prod), SUPABASE_SERVICE_ROLE_KEY,
 * SUPABASE_URL ou VITE_SUPABASE_URL.
 *
 * Usage : node --env-file=.env.local scripts/verify-clerk-webhook-e2e-prod.mjs
 *         node --env-file=.env.vercel.prod.tmp scripts/verify-clerk-webhook-e2e-prod.mjs
 */
import { Webhook } from "svix";

const webhookUrl =
  process.env.CLERK_WEBHOOK_URL ?? "https://www.e-samba.com/api/webhooks/clerk";
const secret = process.env.CLERK_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function fail(msg, extra) {
  console.error(`[verify-clerk-webhook-e2e-prod] ${msg}`, extra ?? "");
  process.exit(1);
}

if (!secret) fail("CLERK_WEBHOOK_SECRET manquant");
if (!supabaseUrl || !serviceKey) fail("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");

const svixId = `msg_e2e_${Date.now()}`;
const timestampSec = Math.floor(Date.now() / 1000);
const timestamp = String(timestampSec);
const event = {
  type: "user.updated",
  object: "event",
  data: {
    id: `user_e2e_${Date.now()}`,
    object: "user",
    first_name: "E2E",
    last_name: "Verify",
    email_addresses: [],
    primary_email_address_id: null,
    phone_numbers: [],
    primary_phone_number_id: null,
  },
};
const rawBody = JSON.stringify(event);
const wh = new Webhook(secret);
try {
  wh.verify(rawBody, {
    "svix-id": svixId,
    "svix-timestamp": timestamp,
    "svix-signature": wh.sign(svixId, new Date(timestampSec * 1000), rawBody),
  });
} catch (err) {
  fail("Signature locale invalide (secret ou payload)", err instanceof Error ? err.message : err);
}
const svixSignature = wh.sign(svixId, new Date(timestampSec * 1000), rawBody);

const postRes = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "svix-id": svixId,
    "svix-timestamp": timestamp,
    "svix-signature": svixSignature,
  },
  body: rawBody,
  redirect: "manual",
});

const postBody = await postRes.text();
let postJson;
try {
  postJson = JSON.parse(postBody);
} catch {
  postJson = { raw: postBody.slice(0, 200) };
}

if (postRes.status !== 200) {
  fail("POST signé rejeté", { status: postRes.status, body: postJson });
}

await new Promise((r) => setTimeout(r, 1500));

const q = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/clerk_webhook_events`);
q.searchParams.set("svix_id", `eq.${svixId}`);
q.searchParams.set("select", "svix_id,event_type,status,received_at,processed_at");

const dbRes = await fetch(q, {
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  },
});
if (!dbRes.ok) {
  fail("Lecture Supabase échouée", { status: dbRes.status, text: await dbRes.text() });
}

const rows = await dbRes.json();
const row = Array.isArray(rows) ? rows[0] : null;
if (!row?.svix_id) {
  fail("Aucune ligne clerk_webhook_events pour svix_id", { svixId });
}
if (row.status !== "success") {
  fail("Ligne présente mais status != success", row);
}

console.log("[verify-clerk-webhook-e2e-prod] OK", {
  url: webhookUrl,
  svixId,
  post: { status: postRes.status, ok: postJson?.ok },
  row: {
    event_type: row.event_type,
    status: row.status,
    received_at: row.received_at,
    processed_at: row.processed_at,
  },
});
