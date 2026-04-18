import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { WhatsappTemplateName } from "./whatsapp-templates.ts";

export interface WhatsappTemplatePayload {
  templateName: WhatsappTemplateName;
  languageCode: string;
  toPhoneE164: string;
  variables?: string[];
}

export function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("Configuration Supabase manquante.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export function normalizeToE164(phone: string): string {
  const trimmed = phone.trim();
  const withPlus = trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  const normalized = withPlus.replace(/[^\d+]/g, "");

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Numéro WhatsApp invalide (format E.164 requis).");
  }

  return normalized;
}

function buildTemplateComponents(variables?: string[]) {
  if (!variables || variables.length === 0) return undefined;

  return [
    {
      type: "body",
      parameters: variables.map((value) => ({
        type: "text",
        text: value,
      })),
    },
  ];
}

export async function sendWhatsappTemplateMessage(
  payload: WhatsappTemplatePayload,
): Promise<{ providerMessageId: string | null; rawResponse: unknown }> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const apiVersion = Deno.env.get("WHATSAPP_API_VERSION") ?? "v20.0";

  if (!accessToken || !phoneNumberId) {
    throw new Error("Configuration WhatsApp incomplète.");
  }

  const components = buildTemplateComponents(payload.variables);
  const whatsappPayload = {
    messaging_product: "whatsapp",
    to: payload.toPhoneE164,
    type: "template",
    template: {
      name: payload.templateName,
      language: { code: payload.languageCode },
      ...(components ? { components } : {}),
    },
  };

  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const providerRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(whatsappPayload),
  });

  const responseBody = await providerRes.text();
  let parsedBody: unknown = null;
  try {
    parsedBody = responseBody ? JSON.parse(responseBody) : null;
  } catch {
    parsedBody = responseBody;
  }

  if (!providerRes.ok) {
    throw new Error(
      `Provider WhatsApp en échec (${providerRes.status}): ${
        typeof responseBody === "string" ? responseBody : "réponse invalide"
      }`,
    );
  }

  const providerMessageId =
    (parsedBody as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id ?? null;

  return { providerMessageId, rawResponse: parsedBody };
}
