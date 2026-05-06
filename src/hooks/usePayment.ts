import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export type Gateway = "orange_money_cm" | "mtn_momo_cm";

export interface InitiatePaymentParams {
  plan_code: string;
  phone_number: string;
  gateway: Gateway;
}

export interface InitiatePaymentResult {
  payment_url: string | null;
  transaction_id: string;
  amount_xaf: number;
  plan_name: string;
}

// ── Initiation ───────────────────────────────────────────────────────────────

export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: InitiatePaymentParams): Promise<InitiatePaymentResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const idempotency_key = crypto.randomUUID();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ...params, idempotency_key }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec du paiement");

      // Stocker le transaction_id en local pour le polling
      sessionStorage.setItem("pending_payment_txn", data.transaction_id);

      return data as InitiatePaymentResult;
    },
    onSuccess: () => {
      // Invalider le cache abonnement après initiation (sera re-fetchée après confirmation)
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

// ── Polling statut paiement ───────────────────────────────────────────────────

export interface PaymentStatus {
  id: string;
  status: "pending" | "completed" | "failed";
  gateway: Gateway;
  amount_xaf: number;
  initiated_at: string;
  confirmed_at: string | null;
}

export function usePaymentStatus(transactionId: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["payment-status", transactionId],
    enabled: !!transactionId,
    // Polling toutes les 5 secondes tant que pending
    refetchInterval: (query) => {
      const data = query.state.data as PaymentStatus | undefined;
      if (!data || data.status === "pending") return 5_000;
      return false;
    },
    queryFn: async (): Promise<PaymentStatus> => {
      const { data, error } = await supabase
        .from("paiements")
        .select("id, status, gateway, amount_xaf, initiated_at, confirmed_at")
        .eq("gateway_transaction_id", transactionId)
        .single();

      if (error) throw new Error(error.message);

      // Si confirmé → invalider l'abonnement pour rafraîchir le plan
      if (data.status === "completed") {
        sessionStorage.removeItem("pending_payment_txn");
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
      }

      return data as PaymentStatus;
    },
    networkMode: "offlineFirst",
  });
}
