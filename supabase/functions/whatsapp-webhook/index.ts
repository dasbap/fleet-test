import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient } from "../_shared/whatsapp-client.ts";

type WebhookMessageStatus = "sent" | "delivered" | "read" | "failed";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mapMetaStatus(status: string): WebhookMessageStatus | null {
  if (status === "sent") return "sent";
  if (status === "delivered") return "delivered";
  if (status === "read") return "read";
  if (status === "failed") return "failed";
  return null;
}

function computeNextRetry(retryCount: number): string {
  const delaySeconds = Math.min(300, 60 * 2 ** retryCount);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i]! ^ bb[i]!;
  return diff === 0;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyMetaWebhookSignature(req: Request, rawBody: string): Promise<boolean> {
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) {
    return false;
  }

  const header = req.headers.get("X-Hub-Signature-256") ?? req.headers.get("x-hub-signature-256");
  if (!header || !header.startsWith("sha256=")) {
    return false;
  }

  const receivedDigest = header.slice("sha256=".length).trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(receivedDigest)) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedDigest = toHex(new Uint8Array(signature));

  return timingSafeEqualStrings(receivedDigest, computedDigest);
}

async function processStatusEvent(
  supabase: ReturnType<typeof createServiceClient>,
  statusEvent: Record<string, unknown>,
): Promise<void> {
  const providerMessageId = typeof statusEvent.id === "string" ? statusEvent.id : null;
  const mappedStatus = mapMetaStatus(typeof statusEvent.status === "string" ? statusEvent.status : "");

  if (!providerMessageId || !mappedStatus) return;

  const { data: logRow, error: lookupError } = await supabase
    .from("whatsapp_outbound_logs")
    .select("id, retry_count, max_retries")
    .eq("provider_message_id", providerMessageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[whatsapp-webhook] lookup error:", lookupError);
    return;
  }

  if (!logRow?.id) {
    return;
  }

  const retryCount = typeof logRow.retry_count === "number" ? logRow.retry_count : 0;
  const maxRetries = typeof logRow.max_retries === "number" ? logRow.max_retries : 3;
  const shouldRetry = mappedStatus === "failed" && retryCount < maxRetries;

  const { error: updateError } = await supabase
    .from("whatsapp_outbound_logs")
    .update({
      status: shouldRetry ? "retry_scheduled" : mappedStatus,
      next_retry_at: shouldRetry ? computeNextRetry(retryCount) : null,
      error_code:
        typeof statusEvent["errors"] === "object" && statusEvent["errors"] !== null
          ? "meta_status_failed"
          : null,
      error_message:
        mappedStatus === "failed"
          ? "Meta a retourné un statut failed via webhook."
          : null,
      provider_payload: statusEvent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", logRow.id);

  if (updateError) {
    console.error("[whatsapp-webhook] update error:", updateError);
  }
}

Deno.serve(async (req) => {
  const supabase = createServiceClient();

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    if (mode === "subscribe" && expectedToken && token === expectedToken && challenge) {
      return new Response(challenge, { status: 200 });
    }

    return jsonResponse({ error: "Vérification webhook échouée." }, 403);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  try {
    const rawBody = await req.text();
    const signatureValid = await verifyMetaWebhookSignature(req, rawBody);
    if (!signatureValid) {
      return jsonResponse({ error: "Signature webhook invalide." }, 401);
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const { error: insertEventError } = await supabase.from("whatsapp_webhook_events").insert({
      event_type: "meta_webhook",
      payload,
      received_at: new Date().toISOString(),
    });

    if (insertEventError) {
      console.error("[whatsapp-webhook] insert event error:", insertEventError);
    }

    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray((entry as { changes?: unknown[] }).changes)
        ? ((entry as { changes?: unknown[] }).changes ?? [])
        : [];
      for (const change of changes) {
        const value = (change as { value?: Record<string, unknown> }).value;
        const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
        for (const statusEvent of statuses) {
          await processStatusEvent(supabase, statusEvent as Record<string, unknown>);
        }
      }
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("[whatsapp-webhook] unexpected error:", error);
    return jsonResponse({ error: "Erreur interne webhook." }, 500);
  }
});
