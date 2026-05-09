import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  createServiceClient,
  normalizeToE164,
  sendWhatsappTemplateMessage,
} from "../_shared/whatsapp-client.ts";
import {
  isWhatsappTemplateName,
  type WhatsappTemplateName,
} from "../_shared/whatsapp-templates.ts";

interface JwtClaims {
  sub?: string;
  [key: string]: unknown;
}

const sendWhatsappSchema = z.object({
  fleetId: z.string().uuid("fleetId invalide"),
  alertId: z.string().uuid("alertId invalide").optional(),
  recipientUserId: z.string().uuid("recipientUserId invalide").optional(),
  recipientPhone: z.string().min(5, "recipientPhone invalide").optional(),
  templateName: z.string().min(1, "templateName requis"),
  languageCode: z.string().min(2).max(10).default("fr"),
  variables: z.array(z.string().min(1)).max(10).optional(),
});

type SendWhatsappInput = z.infer<typeof sendWhatsappSchema>;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function readAuthUserId(req: Request): string | null {
  const raw = req.headers.get("Authorization") ?? "";
  const token = raw.startsWith("Bearer ") ? raw.slice("Bearer ".length) : "";
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(atob(parts[1])) as JwtClaims;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function resolveRecipientPhone(
  supabase: ReturnType<typeof createServiceClient>,
  payload: SendWhatsappInput,
): Promise<string> {
  if (payload.recipientPhone) {
    return normalizeToE164(payload.recipientPhone);
  }

  if (!payload.recipientUserId) {
    throw new Error("recipientPhone ou recipientUserId requis.");
  }

  const { data, error } = await supabase
    .from("profils")
    .select("phone")
    .eq("user_id", payload.recipientUserId)
    .maybeSingle();

  if (error) {
    console.error("[send-whatsapp] Échec lecture profils:", error);
    throw new Error("Impossible de récupérer le destinataire.");
  }

  const phone = typeof data?.phone === "string" ? data.phone : "";
  if (!phone.trim()) {
    throw new Error("Aucun numéro de téléphone disponible pour le destinataire.");
  }

  return normalizeToE164(phone);
}

async function insertOutboundLog(
  supabase: ReturnType<typeof createServiceClient>,
  payload: SendWhatsappInput,
  log: {
    status: "queued" | "sent" | "failed" | "retry_scheduled";
    phoneE164: string;
    createdByUserId: string;
    retryCount?: number;
    nextRetryAt?: string | null;
    providerMessageId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    providerPayload?: unknown;
  },
): Promise<void> {
  const { error } = await supabase.from("whatsapp_outbound_logs").insert({
    fleet_id: payload.fleetId,
    alert_id: payload.alertId ?? null,
    recipient_user_id: payload.recipientUserId ?? null,
    phone_e164: log.phoneE164,
    template_name: payload.templateName,
    status: log.status,
    retry_count: log.retryCount ?? 0,
    next_retry_at: log.nextRetryAt ?? null,
    last_attempt_at: new Date().toISOString(),
    provider_message_id: log.providerMessageId ?? null,
    error_code: log.errorCode ?? null,
    error_message: log.errorMessage ?? null,
    provider_payload: log.providerPayload ?? null,
    template_variables: payload.variables ?? [],
    created_by_user_id: log.createdByUserId,
  });

  if (error) {
    console.error("[send-whatsapp] Échec insertion whatsapp_outbound_logs:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  const authUserId = readAuthUserId(req);
  if (!authUserId) {
    return jsonResponse({ error: "Authentification requise." }, 401);
  }

  try {
    const raw = await req.json();
    const payload = sendWhatsappSchema.parse(raw);
    if (!isWhatsappTemplateName(payload.templateName)) {
      return jsonResponse({ error: "Template WhatsApp non autorisé." }, 400);
    }

    const supabase = createServiceClient();

    const recipientPhone = await resolveRecipientPhone(supabase, payload);
    await insertOutboundLog(supabase, payload, {
      status: "queued",
      phoneE164: recipientPhone,
      createdByUserId: authUserId,
    });

    try {
      const providerResult = await sendWhatsappTemplateMessage({
        templateName: payload.templateName as WhatsappTemplateName,
        languageCode: payload.languageCode,
        toPhoneE164: recipientPhone,
        variables: payload.variables,
      });

      await insertOutboundLog(supabase, payload, {
        status: "sent",
        phoneE164: recipientPhone,
        createdByUserId: authUserId,
        providerMessageId: providerResult.providerMessageId,
        providerPayload: providerResult.rawResponse,
      });

      return jsonResponse({
        success: true,
        providerMessageId: providerResult.providerMessageId,
      });
    } catch (providerError) {
      const message = providerError instanceof Error ? providerError.message : "Erreur provider";
      console.error("[send-whatsapp] Meta API error:", message);
      await insertOutboundLog(supabase, payload, {
        status: "failed",
        phoneE164: recipientPhone,
        createdByUserId: authUserId,
        retryCount: 0,
        nextRetryAt: new Date(Date.now() + 60_000).toISOString(),
        errorCode: "provider_error",
        errorMessage: "Échec provider WhatsApp.",
        providerPayload: { message },
      });
      return jsonResponse({ error: "Échec de l'envoi WhatsApp." }, 502);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        {
          error: "Payload invalide.",
          details: error.issues.map((issue) => issue.message),
        },
        400,
      );
    }

    const message = error instanceof Error ? error.message : "Erreur interne.";
    return jsonResponse({ error: message }, 400);
  }
});
