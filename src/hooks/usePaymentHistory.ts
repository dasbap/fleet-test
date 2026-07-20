/**
 * Historique des paiements d'une organisation.
 * Source : table `paiements` via Supabase RLS (manager/organisateur uniquement).
 * Jamais de mock en production.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PaymentHistoryRepository } from "@/repositories/payment-history.repository";
import { PaymentHistoryService } from "@/services/payment-history.service";
import type { BillingEventRecord, PaymentRecord } from "@/services/payment-history.service";

const paymentHistoryRepository = new PaymentHistoryRepository();
const paymentHistoryService = new PaymentHistoryService(paymentHistoryRepository);

export type { PaymentProvider, PaymentStatus } from "@/services/payment-history.service";
export type { PaymentRecord, BillingEventRecord };

// ─── Libellés affichage ────────────────────────────────────────────────────

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  initiated: "Initié",
  processing: "En cours",
  successful: "Payé",
  succeeded: "Payé",
  failed: "Échoué",
  cancelled: "Annulé",
  canceled: "Annulé",
  refunded: "Remboursé",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-700",
  successful: "bg-green-100 text-green-700",
  succeeded: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  canceled: "bg-gray-100 text-gray-600",
  refunded: "bg-purple-100 text-purple-700",
};

/** Paiement confirmé (Notch `successful` ou BFF `succeeded`). */
export function isSuccessfulPaymentStatus(status: string): boolean {
  return status === "successful" || status === "succeeded";
}

export const PROVIDER_LABELS: Record<string, string> = {
  notch: "Notch Pay",
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
  stripe: "Stripe",
  manual: "Manuel",
};

export interface UsePaymentHistoryReturn {
  payments: PaymentRecord[];
  isLoading: boolean;
  isError: boolean;
  /** Message d'erreur PostgREST lisible. */
  errorMessage: string | null;
  refetch: () => void;
}

export function usePaymentHistory(): UsePaymentHistoryReturn {
  const { orgId } = useAuth();

  const query = useQuery({
    queryKey: ["payment-history", orgId],
    queryFn: () => paymentHistoryService.getPaymentHistory(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
    retry: (failureCount, err) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("permission") || msg.includes("policy")) return false;
      return failureCount < 2;
    },
  });

  return {
    payments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export interface UseBillingEventsReturn {
  events: BillingEventRecord[];
  isLoading: boolean;
  errorMessage: string | null;
}

export function useBillingEvents(fleetId?: string): UseBillingEventsReturn {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId ?? userFleetId;

  const query = useQuery({
    queryKey: ["billing-events", targetFleetId],
    queryFn: () => paymentHistoryService.getBillingEvents(targetFleetId!),
    enabled: !!targetFleetId,
    staleTime: 60_000,
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
