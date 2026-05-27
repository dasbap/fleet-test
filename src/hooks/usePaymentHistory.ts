/**
 * Historique des paiements d'une organisation.
 * Source : table `paiements` via Supabase RLS (manager/organisateur uniquement).
 * Jamais de mock en production.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Types alignés sur la DB ──────────────────────────────────────────────

export type PaymentStatus =
  | "initiated"
  | "processing"
  | "successful"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentProvider =
  | "notch"
  | "orange_money"
  | "mtn_momo"
  | "stripe"
  | "manual";

export interface PaymentRecord {
  id: string;
  org_id: string;
  provider: PaymentProvider;
  /** Référence PSP externe (ex: pay_xxx Notch Pay). */
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  external_ref: string | null;
  idempotency_key: string;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  /** Champs enrichis depuis raw_payload.planCode si disponible. */
  planCode?: string;
  durationMonths?: number;
  vehicleCount?: number;
}

export interface UsePaymentHistoryReturn {
  payments: PaymentRecord[];
  isLoading: boolean;
  isError: boolean;
  /** Message d'erreur PostgREST lisible. */
  errorMessage: string | null;
  refetch: () => void;
}

// ─── Libellés affichage ────────────────────────────────────────────────────

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  initiated:  "Initié",
  processing: "En cours",
  successful: "Payé",
  failed:     "Échoué",
  cancelled:  "Annulé",
  refunded:   "Remboursé",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  initiated:  "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-700",
  successful: "bg-green-100 text-green-700",
  failed:     "bg-red-100 text-red-700",
  cancelled:  "bg-gray-100 text-gray-600",
  refunded:   "bg-purple-100 text-purple-700",
};

export const PROVIDER_LABELS: Record<string, string> = {
  notch:        "Notch Pay",
  orange_money: "Orange Money",
  mtn_momo:     "MTN MoMo",
  stripe:       "Stripe",
  manual:       "Manuel",
};

// ─── Fetch ─────────────────────────────────────────────────────────────────

async function fetchPayments(orgId: string): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from("paiements")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // Erreur PostgREST → message lisible
    throw new Error(error.message ?? `Erreur Supabase (${error.code ?? "unknown"})`);
  }

  // Enrichit depuis raw_payload
  return (data ?? []).map((row) => {
    const payload = row.raw_payload as Record<string, unknown> | null;
    return {
      ...row,
      planCode:      payload?.planCode      as string  | undefined,
      durationMonths: payload?.durationMonths as number | undefined,
      vehicleCount:  payload?.vehicleCount  as number  | undefined,
    } as PaymentRecord;
  });
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function usePaymentHistory(): UsePaymentHistoryReturn {
  const { orgId } = useAuth();

  const query = useQuery({
    queryKey: ["payment-history", orgId],
    queryFn:  () => fetchPayments(orgId!),
    enabled:  !!orgId,
    staleTime: 30_000,
    retry: (failureCount, err) => {
      // Pas de retry sur les erreurs RLS (403/401)
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("permission") || msg.includes("policy")) return false;
      return failureCount < 2;
    },
  });

  return {
    payments:     query.data ?? [],
    isLoading:    query.isLoading,
    isError:      query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : null,
    refetch:      query.refetch,
  };
}

// ─── Hook événements billing ───────────────────────────────────────────────

export interface BillingEventRecord {
  id: string;
  fleet_id: string;
  subscription_id: string | null;
  payment_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_events")
        .select("*")
        .eq("fleet_id", targetFleetId!)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw new Error(error.message);
      return (data ?? []) as BillingEventRecord[];
    },
    enabled: !!targetFleetId,
    staleTime: 60_000,
  });

  return {
    events:       query.data ?? [],
    isLoading:    query.isLoading,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
