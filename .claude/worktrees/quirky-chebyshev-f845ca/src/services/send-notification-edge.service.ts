import { supabase } from "@/integrations/supabase/client";

export interface SendNotificationInput {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class SendNotificationEdgeService {
  async sendToUser(input: SendNotificationInput): Promise<void> {
    const { userId, title, body, data } = input;

    if (!userId) {
      throw new Error("userId requis pour l'envoi de notification.");
    }
    if (!title || !body) {
      throw new Error("Titre et corps de la notification requis.");
    }

    const { error } = await supabase.functions.invoke("send-notification", {
      body: {
        target: {
          userIds: [userId],
        },
        notification: {
          title,
          body,
          data: data ?? {},
        },
      },
    });

    if (error) {
      throw new Error(error.message || "Échec de l'envoi de la notification.");
    }
  }
}

export const sendNotificationEdgeService = new SendNotificationEdgeService();

