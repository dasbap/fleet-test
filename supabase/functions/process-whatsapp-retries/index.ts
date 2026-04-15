import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createServiceClient,
  sendWhatsappTemplateMessage,
} from "../_shared/whatsapp-client.ts";
import {
  isWhatsappTemplateName,
  type WhatsappTemplateName,
} from "../_shared/whatsapp-templates.ts";

function getBearerToken(req: Request): string | null {
  const raw = req.headers.get("Authorization") ?? "";
  if (!raw.startsWith("Bearer ")) return null;
  const token = raw.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
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

function verifyCronSecret(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return false;
  const token = getBearerToken(req);
  if (!token) return false;
  return timingSafeEqualStrings(token, secret);
}

function computeNextRetry(retryCount: number): string {
  const delaySeconds = Math.min(900, 60 * 2 ** retryCount);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  if (!verifyCronSecret(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from("whatsapp_outbound_logs")
    .select("id, phone_e164, template_name, language_code, template_variables, retry_count, max_retries")
    .in("status", ["failed", "retry_scheduled"])
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", nowIso)
    .order("next_retry_at", { ascending: true })
    .limit(30);

  if (error) {
    console.error("[process-whatsapp-retries] query error:", error);
    return new Response(JSON.stringify({ error: "Échec lecture queue retry." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = {
    selected: rows?.length ?? 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const row of rows ?? []) {
    const retryCount = typeof row.retry_count === "number" ? row.retry_count : 0;
    const maxRetries = typeof row.max_retries === "number" ? row.max_retries : 3;
    if (retryCount >= maxRetries) {
      result.skipped++;
      continue;
    }

    if (!isWhatsappTemplateName(row.template_name)) {
      await supabase
        .from("whatsapp_outbound_logs")
        .update({
          status: "failed",
          error_code: "invalid_template",
          error_message: "Template WhatsApp non supporté pour le retry.",
          next_retry_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      result.failed++;
      continue;
    }

    try {
      const provider = await sendWhatsappTemplateMessage({
        templateName: row.template_name as WhatsappTemplateName,
        languageCode: row.language_code ?? "fr",
        toPhoneE164: row.phone_e164,
        variables: asStringArray(row.template_variables),
      });

      await supabase
        .from("whatsapp_outbound_logs")
        .update({
          status: "sent",
          retry_count: retryCount + 1,
          provider_message_id: provider.providerMessageId,
          provider_payload: provider.rawResponse,
          error_code: null,
          error_message: null,
          next_retry_at: null,
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      result.sent++;
    } catch (retryError) {
      const message =
        retryError instanceof Error ? retryError.message : "Erreur retry inconnue";
      const nextRetryCount = retryCount + 1;
      const canRetryAgain = nextRetryCount < maxRetries;

      await supabase
        .from("whatsapp_outbound_logs")
        .update({
          status: canRetryAgain ? "retry_scheduled" : "failed",
          retry_count: nextRetryCount,
          error_code: "retry_provider_error",
          error_message: "Retry provider WhatsApp en échec.",
          provider_payload: { message },
          next_retry_at: canRetryAgain ? computeNextRetry(nextRetryCount) : null,
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      result.failed++;
    }
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
