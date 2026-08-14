import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const NOTCH_PAY_INITIATE_URL = "/api/billing/notch/initiate";

export interface NotchPayIntent {
  planCode: string;
  planName: string;
  vehicleCount: number;
  durationMonths?: number;
  vehicleIds?: string[];
  phone?: string;
  email?: string;
}

export interface NotchPayInitiateResult {
  paymentId: string;
  reference: string;
  checkoutUrl: string;
  amountXaf: number;
}

async function callInitiate(
  intent: NotchPayIntent,
  orgId: string,
  fleetId: string,
  accessToken: string,
): Promise<NotchPayInitiateResult> {
  const res = await fetch(NOTCH_PAY_INITIATE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      orgId,
      fleetId,
      planCode: intent.planCode,
      vehicleCount: intent.vehicleCount,
      durationMonths: intent.durationMonths ?? 1,
      ...(intent.vehicleIds?.length ? { vehicleIds: intent.vehicleIds } : {}),
      ...(intent.phone ? { phone: intent.phone } : {}),
      ...(intent.email ? { email: intent.email } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = `Erreur API Notch Pay (${res.status})`;
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) msg = json.error;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }

  return (await res.json()) as NotchPayInitiateResult;
}

/**
 * Lance un paiement Notch Pay et redirige vers l'URL de checkout.
 * L'activation de l'abonnement se fait ensuite exclusivement via le webhook.
 */
export function useNotchPayPayment() {
  const { orgId, activeTenantContext, session } = useAuth();
  const fleetId = activeTenantContext?.fleetId;

  return useMutation({
    mutationFn: async (intent: NotchPayIntent): Promise<NotchPayInitiateResult> => {
      if (!orgId) throw new Error("Organisation introuvable.");
      if (!fleetId) throw new Error("Flotte introuvable.");
      if (!session?.access_token) throw new Error("Session expirée — reconnectez-vous.");
      return callInitiate(intent, orgId, fleetId, session.access_token);
    },
    onSuccess: ({ checkoutUrl, amountXaf, reference }) => {
      toast({
        title: "Redirection vers Notch Pay…",
        description: `${amountXaf.toLocaleString("fr-FR")} FCFA — réf. ${reference}`,
      });
      // Délai léger pour que le toast soit visible avant la redirection
      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 800);
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
