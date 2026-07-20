import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { MobileMoneyService, type MoMoPaymentIntent, type MoMoPaymentResult } from "@/services/mobile-money.service";
import { toast } from "@/hooks/use-toast";

const service = new MobileMoneyService();

export type { MoMoPaymentResult };

export function useMoMoPayment() {
  const queryClient = useQueryClient();
  const { orgId, activeTenantContext, session } = useAuth();
  const fleetId = activeTenantContext?.fleetId;

  return useMutation({
    mutationFn: async (
      intent: Omit<MoMoPaymentIntent, "orgId" | "fleetId">,
    ): Promise<MoMoPaymentResult> => {
      if (!orgId) throw new Error("Organisation introuvable");
      if (!fleetId) throw new Error("Flotte introuvable");
      return service.initiatePayment(
        { ...intent, orgId, fleetId },
        { accessToken: session?.access_token },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-snapshot"] });
      toast({
        title: "Paiement initié",
        description:
          "Instructions affichées. Après confirmation par le prestataire, votre abonnement sera mis à jour automatiquement.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Erreur paiement",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
