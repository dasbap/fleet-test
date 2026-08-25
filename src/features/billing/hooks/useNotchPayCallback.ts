import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const NOTCH_PAY_CALLBACK_PARAMS = [
  "status",
  "ref",
  "reference",
  "trxref",
  "notchpay_trxref",
] as const;

interface ReconcileResult {
  paymentStatus: string;
  subscriptionActivated: boolean;
  subscriptionId?: string;
}

export function useNotchPayCallback(): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { orgId, activeTenantContext, session } = useAuth();

  useEffect(() => {
    const status = searchParams.get("status")?.toLowerCase();
    if (!status) return;

    const merchantRef =
      searchParams.get("ref") ??
      searchParams.get("notchpay_trxref") ??
      searchParams.get("trxref");

    const clearCallbackParams = () => {
      const next = new URLSearchParams(searchParams);
      for (const key of NOTCH_PAY_CALLBACK_PARAMS) next.delete(key);
      setSearchParams(next, { replace: true });
    };

    if (status === "failed" || status === "cancelled" || status === "canceled") {
      toast({
        title: "Paiement non complété",
        description: "Le paiement a été annulé ou a échoué.",
        variant: "destructive",
      });
      clearCallbackParams();
      return;
    }

    if (status !== "success" && status !== "complete") {
      clearCallbackParams();
      return;
    }

    const fleetId = activeTenantContext?.fleetId;
    const accessToken = session?.access_token;
    if (!merchantRef || !orgId || !fleetId || !accessToken) {
      toast({
        title: "Paiement reçu",
        description: "Impossible de confirmer automatiquement l'abonnement. Rechargez la page ou reconnectez-vous.",
        variant: "destructive",
      });
      clearCallbackParams();
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/billing/notch/reconcile", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ orgId, fleetId, merchantRef }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(body?.error ?? `Réconciliation Notch Pay impossible (${response.status}).`);
        }

        const result = await response.json() as ReconcileResult;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["billing-snapshot"] }),
          queryClient.invalidateQueries({ queryKey: ["fleet-billing-context"] }),
          queryClient.invalidateQueries({ queryKey: ["fleet-subscriptions"] }),
          queryClient.invalidateQueries({ queryKey: ["payment-history"] }),
          queryClient.invalidateQueries({ queryKey: ["billing-events"] }),
        ]);

        if (!cancelled) {
          if (result.paymentStatus === "succeeded") {
            toast({
              title: "Abonnement activé",
              description: merchantRef ? `Paiement confirmé — réf. ${merchantRef}.` : "Paiement confirmé.",
            });
          } else {
            toast({
              title: "Paiement en cours de confirmation",
              description: "Notch Pay n'a pas encore confirmé définitivement la transaction.",
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Paiement reçu, activation non confirmée",
            description: error instanceof Error ? error.message : "Réconciliation impossible.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) clearCallbackParams();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
