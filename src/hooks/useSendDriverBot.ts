import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { sendWhatsappEdgeService } from "@/services/send-whatsapp-edge.service";
import {
  getDriverBotTemplate,
  type DriverBotEvent,
} from "@/constants/whatsapp-template-mapping";
import { toast } from "@/hooks/use-toast";

export type { DriverBotEvent };

/**
 * Envoie un template WhatsApp interactif à un conducteur.
 * Utilise les boutons CTA/quick-reply définis dans INTERACTIVE_TEMPLATE_BUTTONS.
 */
export function useSendDriverBot() {
  const { userFleetId } = useAuth();

  return useMutation({
    mutationFn: async ({
      event,
      recipientUserId,
      recipientPhone,
      variables = [],
    }: {
      event: DriverBotEvent;
      recipientUserId?: string;
      recipientPhone?: string;
      variables?: string[];
    }) => {
      if (!userFleetId) throw new Error("Flotte introuvable");

      const templateName = getDriverBotTemplate(event);
      return sendWhatsappEdgeService.send({
        fleetId: userFleetId,
        templateName,
        recipientUserId,
        recipientPhone,
        variables,
      });
    },
    onSuccess: () => {
      toast({ title: "Message WhatsApp envoyé" });
    },
    onError: (err: Error) => {
      toast({
        title: "Envoi WhatsApp échoué",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
