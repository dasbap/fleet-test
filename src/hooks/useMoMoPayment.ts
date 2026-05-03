import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { MobileMoneyService, type MoMoPaymentIntent, type MoMoPaymentResult } from "@/services/mobile-money.service";
import { toast } from "@/hooks/use-toast";

const service = new MobileMoneyService();

export type { MoMoPaymentResult };

export function useMoMoPayment() {
  const { orgId, activeTenantContext } = useAuth();
  const fleetId = activeTenantContext?.fleetId;

  return useMutation({
    mutationFn: async (
      intent: Omit<MoMoPaymentIntent, "orgId" | "fleetId">,
    ): Promise<MoMoPaymentResult> => {
      if (!orgId) throw new Error("Organisation introuvable");
      if (!fleetId) throw new Error("Flotte introuvable");
      return service.initiatePayment({ ...intent, orgId, fleetId });
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
