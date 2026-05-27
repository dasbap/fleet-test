/**
 * Webhook Clerk → Supabase (point d’entrée unique sur Vercel).
 * Synchronise utilisateurs, organisations et adhésions vers `profils`, `flottes`,
 * `flotte_adhesions` ; idempotence via `clerk_webhook_events` (svix-id).
 *
 * URL à enregistrer dans le dashboard Clerk :
 *   https://www.e-samba.com/api/webhooks/clerk
 *
 * Variables Vercel : CLERK_WEBHOOK_SECRET, SUPABASE_URL (ou VITE_SUPABASE_URL),
 * SUPABASE_SERVICE_ROLE_KEY.
 *
 * Routing Vercel : `vercel.json` exclut les chemins `/api…` du fallback SPA
 * (`/((?!api(/|$)).*)` → `index.html`) pour éviter qu’un POST webhook soit réécrit
 * vers le HTML. Les fonctions `/api/*.ts` sont toujours prioritaires sur les rewrites.
 *
 * Vérification locale : `npm run test:clerk-webhook`
 *
 * Événements recommandés dans Clerk :
 *   user.created | user.updated | user.deleted
 *   organization.created | organization.updated
 *   organizationMembership.created | organizationMembership.updated
 */

import { Webhook } from "svix";
import { createClient } from "@supabase/supabase-js";
import {
  handleOrganizationUpsert,
  handleOrgMembershipSync,
  handleUserCreated,
  handleUserDeleted,
  handleUserUpdated,
} from "../../src/lib/webhooks/clerk/handlers.js";
import {
  isPostgresUniqueViolation,
  type ClerkOrgMembershipPayload,
  type ClerkUserPayload,
} from "../../src/lib/webhooks/clerk/pure.js";

export const config = { runtime: "edge" };

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Clerk webhook] CLERK_WEBHOOK_SECRET manquant");
    return new Response("Configuration manquante", { status: 500 });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) {
    console.error("[Clerk webhook] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
    return new Response("Configuration manquante", { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonResponse({ error: "Body illisible." }, 400);
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonResponse({ error: "Headers svix manquants." }, 401);
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch (err) {
    console.error("[Clerk webhook] Signature invalide:", err);
    return jsonResponse({ error: "Signature invalide." }, 401);
  }

  const { type, data } = event;

  const { data: existingEvent } = await supabaseAdmin
    .from("clerk_webhook_events")
    .select("id")
    .eq("svix_id", svixId)
    .maybeSingle();

  if (existingEvent?.id) {
    console.log(`[Clerk webhook] ${svixId} déjà traité — ignoré.`);
    return jsonResponse({ ok: true, skipped: true });
  }

  const { error: insertErr } = await supabaseAdmin.from("clerk_webhook_events").insert({
    svix_id: svixId,
    event_type: type,
    payload: data,
  });

  if (insertErr) {
    if (isPostgresUniqueViolation(insertErr)) {
      console.log(`[Clerk webhook] ${svixId} course idempotence — ignoré.`);
      return jsonResponse({ ok: true, skipped: true });
    }
    console.error("[Clerk webhook] Insert événement:", insertErr);
    return jsonResponse({ error: "Journalisation webhook impossible." }, 500);
  }

  try {
    switch (type) {
      case "user.created":
        await handleUserCreated(supabaseAdmin, data as unknown as ClerkUserPayload);
        break;
      case "user.updated":
        await handleUserUpdated(supabaseAdmin, data as unknown as ClerkUserPayload);
        break;
      case "user.deleted":
        await handleUserDeleted(supabaseAdmin, data as unknown as { id: string });
        break;
      case "organization.created":
      case "organization.updated":
        await handleOrganizationUpsert(supabaseAdmin, {
          id: data.id as string,
          name: data.name as string | null | undefined,
        });
        break;
      case "organizationMembership.created":
      case "organizationMembership.updated":
        await handleOrgMembershipSync(supabaseAdmin, data as unknown as ClerkOrgMembershipPayload);
        break;
      default:
        console.log(`[Clerk webhook] événement ignoré : ${type}`);
    }

    await supabaseAdmin
      .from("clerk_webhook_events")
      .update({ status: "success", processed_at: new Date().toISOString() })
      .eq("svix_id", svixId);

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(`[Clerk webhook] Erreur ${type}:`, err);
    await supabaseAdmin
      .from("clerk_webhook_events")
      .update({
        status: "error",
        error_message: err instanceof Error ? err.message : String(err),
        processed_at: new Date().toISOString(),
      })
      .eq("svix_id", svixId);
    return jsonResponse({ error: "Erreur traitement." }, 500);
  }
}
