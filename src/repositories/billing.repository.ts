import { supabase } from "@/integrations/supabase/client";

interface SubscriptionRow {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  plan_id: string;
  plans: {
    id: string;
    code: string;
    name: string;
    price_per_vehicle: number;
  } | null;
}

interface PaymentRow {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export class BillingRepository {
  /**
   * Dernière ligne d’abonnement (tri par fin), pour détecter un plan payant expiré.
   */
  async findLatestSubscriptionByFleetId(fleetId: string): Promise<SubscriptionRow | null> {
    const { data, error } = await supabase
      .from("abonnements")
      .select("id, status, starts_at, ends_at, plan_id, plans(id, code, name, price_per_vehicle)")
      .eq("fleet_id", fleetId)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRow>();

    if (error) {
      console.error("Erreur lors de la lecture de l'abonnement :", error);
      throw new Error(error.message);
    }

    return data ?? null;
  }

  /**
   * Abonnement courant actif (aligné sur la fenêtre temporelle du RPC `get_fleet_billing_context`).
   */
  async findActiveSubscriptionByFleetId(fleetId: string): Promise<SubscriptionRow | null> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("abonnements")
      .select("id, status, starts_at, ends_at, plan_id, plans(id, code, name, price_per_vehicle)")
      .eq("fleet_id", fleetId)
      .eq("status", "active")
      .lte("starts_at", nowIso)
      .gte("ends_at", nowIso)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRow>();

    if (error) {
      console.error("Erreur lors de la lecture de l'abonnement :", error);
      throw new Error(error.message);
    }

    return data ?? null;
  }

  /**
   * Abonnement non encore actif mais autorisant l'accès au site.
   */
  async findPendingSubscriptionByFleetId(fleetId: string): Promise<SubscriptionRow | null> {
    const { data, error } = await supabase
      .from("abonnements")
      .select("id, status, starts_at, ends_at, plan_id, plans(id, code, name, price_per_vehicle)")
      .eq("fleet_id", fleetId)
      .in("status", ["inactive", "pending_payment"])
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRow>();

    if (error) {
      console.error("Erreur lors de la lecture de l'abonnement en attente :", error);
      throw new Error(error.message);
    }

    return data ?? null;
  }

  async findLatestPaymentsByOrgId(orgId: string): Promise<PaymentRow[]> {
    const { data, error } = await supabase
      .from("paiements")
      .select("id, provider, amount, currency, status, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<PaymentRow[]>();

    if (error) {
      console.error("Erreur lors de la lecture des paiements :", error);
      throw new Error(error.message);
    }

    return data ?? [];
  }
}
