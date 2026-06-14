import { supabase } from "@/integrations/supabase/client";

export type PaymentStatus =
  | "initiated"
  | "processing"
  | "successful"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "canceled"
  | "refunded";

export type PaymentProvider =
  | "notch"
  | "orange_money"
  | "mtn_momo"
  | "stripe"
  | "manual";

export interface PaymentRow {
  id: string;
  org_id: string;
  provider: PaymentProvider;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  external_ref: string | null;
  idempotency_key: string;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface BillingEventRow {
  id: string;
  fleet_id: string;
  subscription_id: string | null;
  payment_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Accès Supabase pour l'historique de paiements et événements billing.
 */
export class PaymentHistoryRepository {
  async findPaymentsByOrg(orgId: string, limit = 50): Promise<PaymentRow[]> {
    const { data, error } = await supabase
      .from("paiements")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erreur chargement paiements:", error);
      throw new Error(error.message ?? `Erreur Supabase (${error.code ?? "unknown"})`);
    }

    return (data ?? []) as PaymentRow[];
  }

  async findBillingEventsByFleet(fleetId: string, limit = 30): Promise<BillingEventRow[]> {
    const { data, error } = await supabase
      .from("billing_events")
      .select("*")
      .eq("fleet_id", fleetId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erreur chargement billing_events:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as BillingEventRow[];
  }
}
