import { supabase } from "@/integrations/supabase/client";
import {
  type WhatsappTemplateName,
  INTERACTIVE_TEMPLATE_BUTTONS,
  TEMPLATE_CATEGORIES,
} from "@/constants/whatsapp-templates";

export interface SendWhatsappInput {
  fleetId: string;
  templateName: WhatsappTemplateName;
  recipientUserId?: string;
  recipientPhone?: string;
  alertId?: string;
  languageCode?: string;
  variables?: string[];
  /**
   * Composants boutons pour les templates interactifs (renseignés automatiquement si omis
   * et que INTERACTIVE_TEMPLATE_BUTTONS contient des boutons pour ce template).
   */
  buttonComponents?: unknown[];
}

interface SendWhatsappSuccessResponse {
  success: boolean;
  providerMessageId?: string | null;
}

interface SendWhatsappErrorResponse {
  error?: string;
}

export class SendWhatsappEdgeService {
  async send(input: SendWhatsappInput): Promise<SendWhatsappSuccessResponse> {
    if (!input.fleetId) {
      throw new Error("fleetId requis pour l'envoi WhatsApp.");
    }
    if (!input.templateName) {
      throw new Error("templateName requis pour l'envoi WhatsApp.");
    }
    if (!input.recipientUserId && !input.recipientPhone) {
      throw new Error("recipientUserId ou recipientPhone requis pour l'envoi WhatsApp.");
    }

    // Auto-inject button components for interactive templates if not provided.
    const isInteractive = TEMPLATE_CATEGORIES[input.templateName] === "interactive";
    const buttonComponents =
      input.buttonComponents ??
      (isInteractive ? (INTERACTIVE_TEMPLATE_BUTTONS[input.templateName] ?? []) : []);

    const { data, error } = await supabase.functions.invoke<SendWhatsappSuccessResponse>(
      "send-whatsapp",
    {
      body: {
        fleetId: input.fleetId,
        alertId: input.alertId,
        recipientUserId: input.recipientUserId,
        recipientPhone: input.recipientPhone,
        templateName: input.templateName,
        languageCode: input.languageCode ?? "fr",
        variables: input.variables ?? [],
        buttonComponents: buttonComponents.length > 0 ? buttonComponents : undefined,
      },
    });

    if (error) {
      throw new Error(error.message || "Échec de l'envoi WhatsApp.");
    }

    const response = data as SendWhatsappSuccessResponse | SendWhatsappErrorResponse | null;
    if (!response || ("success" in response && response.success !== true)) {
      const message = (response as SendWhatsappErrorResponse | null)?.error;
      throw new Error(message || "Échec de l'envoi WhatsApp.");
    }

    return response as SendWhatsappSuccessResponse;
  }
}

export const sendWhatsappEdgeService = new SendWhatsappEdgeService();
