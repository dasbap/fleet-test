import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubscriptionStatus } from "@/types/billing-production";

// ─── Règles d'accès par statut ─────────────────────────────

export interface SubscriptionAccessRule {
  /** Max véhicules autorisés (Infinity = illimité selon plan). */
  maxVehicles: number;
  canAddVehicles: boolean;
  /** Accès aux features premium (finance, IA, rapports avancés). */
  premiumFeatures: boolean;
  /** Accès aux opérations terrain (DVIR, carburant, incidents). */
  terrainAccess: boolean;
  /** Lecture seule — pas d'écritures métier. */
  isReadOnly: boolean;
  /** Doit passer à la caisse pour continuer. */
  needsUpgrade: boolean;
  /** Message UX contextuel. */
  message: string;
  /** Sévérité UI : info | warning | error | muted. */
  severity: "info" | "warning" | "error" | "muted";
}

export const SUBSCRIPTION_ACCESS: Record<SubscriptionStatus, SubscriptionAccessRule> = {
  trial: {
    maxVehicles: 3,
    canAddVehicles: true,
    premiumFeatures: false,
    terrainAccess: true,
    isReadOnly: false,
    needsUpgrade: false,
    message: "Vous êtes en période d'essai gratuite (max 3 véhicules). Passez à un plan payant pour débloquer toutes les fonctionnalités.",
    severity: "info",
  },
  pending_payment: {
    maxVehicles: 3,
    canAddVehicles: false,
    premiumFeatures: false,
    terrainAccess: true,
    isReadOnly: false,
    needsUpgrade: false,
    message: "Paiement en cours de confirmation. Votre accès sera mis à jour automatiquement sous peu.",
    severity: "info",
  },
  active: {
    maxVehicles: Infinity,
    canAddVehicles: true,
    premiumFeatures: true,
    terrainAccess: true,
    isReadOnly: false,
    needsUpgrade: false,
    message: "",
    severity: "info",
  },
  grace_period: {
    maxVehicles: Infinity,
    canAddVehicles: false,
    premiumFeatures: false,
    terrainAccess: true,
    isReadOnly: false,
    needsUpgrade: true,
    message: "Votre abonnement a expiré. Accès terrain maintenu temporairement. Renouvelez avant la suspension automatique.",
    severity: "warning",
  },
  suspended: {
    maxVehicles: 0,
    canAddVehicles: false,
    premiumFeatures: false,
    terrainAccess: false,
    isReadOnly: true,
    needsUpgrade: true,
    message: "Flotte suspendue. Accès limité à la lecture et à la clôture minimale. Renouvelez votre abonnement.",
    severity: "error",
  },
  expired: {
    maxVehicles: 0,
    canAddVehicles: false,
    premiumFeatures: false,
    terrainAccess: false,
    isReadOnly: true,
    needsUpgrade: true,
    message: "Abonnement terminé. Renouvelez pour réactiver votre flotte.",
    severity: "error",
  },
  cancelled: {
    maxVehicles: 0,
    canAddVehicles: false,
    premiumFeatures: false,
    terrainAccess: false,
    isReadOnly: true,
    needsUpgrade: true,
    message: "Abonnement résilié. Contactez le support ou souscrivez un nouveau plan pour reprendre.",
    severity: "muted",
  },
};

// ─── Fonctions lifecycle ────────────────────────────────────

/**
 * Crée un abonnement trial pour une flotte (idempotent).
 * Délègue au RPC SQL billing_start_trial.
 */
export async function startTrial(
  admin: SupabaseClient,
  fleetId: string,
  trialDays = 30,
): Promise<string> {
  const { data, error } = await admin.rpc("billing_start_trial", {
    p_fleet_id: fleetId,
    p_trial_days: trialDays,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * Crée un enregistrement paiement + passe la flotte en pending_payment.
 * L'activation réelle se fait via le webhook (activateSubscriptionAfterPayment).
 */
export async function initiateSubscriptionPayment(
  admin: SupabaseClient,
  fleetId: string,
  planCode: string,
  durationMonths = 1,
): Promise<{ subscriptionId: string; paymentId: string }> {
  // Récupère le plan
  const { data: plan, error: planErr } = await admin
    .from("plans")
    .select("id, price_per_vehicle, max_vehicles")
    .eq("code", planCode)
    .eq("is_active", true)
    .maybeSingle<{ id: string; price_per_vehicle: number; max_vehicles: number | null }>();

  if (planErr) throw new Error(planErr.message);
  if (!plan) throw new Error(`Plan introuvable : ${planCode}`);

  // Abonnement courant de la flotte
  const { data: existing, error: subErr } = await admin
    .from("abonnements")
    .select("id, status")
    .eq("fleet_id", fleetId)
    .in("status", ["trial", "active", "grace_period", "pending_payment"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  if (subErr) throw new Error(subErr.message);

  // Crée un paiement initié
  const idempotencyKey = crypto.randomUUID();
  const externalRef = `ESAMBA-${Date.now().toString(36).toUpperCase()}`;

  const { data: paiement, error: payErr } = await admin
    .from("paiements")
    .insert({
      org_id: fleetId, // sera remplacé par org_id réel si disponible
      provider: "notch",
      amount: 0, // montant calculé côté webhook après confirmation
      currency: "XAF",
      status: "initiated",
      external_ref: externalRef,
      idempotency_key: idempotencyKey,
      raw_payload: {
        planCode,
        fleetId,
        durationMonths,
        vehicleCount: plan.max_vehicles ?? 1,
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (payErr) throw new Error(payErr.message);

  // Met à jour ou crée l'abonnement en pending_payment
  let subscriptionId: string;

  if (existing?.id) {
    const { error: updErr } = await admin
      .from("abonnements")
      .update({ status: "pending_payment" })
      .eq("id", existing.id);
    if (updErr) throw new Error(updErr.message);
    subscriptionId = existing.id;
  } else {
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setUTCMonth(endsAt.getUTCMonth() + durationMonths);

    const { data: newSub, error: insErr } = await admin
      .from("abonnements")
      .insert({
        fleet_id: fleetId,
        plan_id: plan.id,
        payment_id: paiement.id,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "pending_payment",
        vehicle_slots: Math.max(1, plan.max_vehicles ?? 1),
      })
      .select("id")
      .single<{ id: string }>();

    if (insErr) throw new Error(insErr.message);
    subscriptionId = newSub.id;
  }

  return { subscriptionId, paymentId: paiement.id };
}

/**
 * Passe un abonnement pending_payment → active après confirmation webhook.
 * Appelé exclusivement côté serveur (Edge Function).
 */
export async function activateSubscriptionAfterPayment(
  admin: SupabaseClient,
  subscriptionId: string,
): Promise<void> {
  const { error } = await admin
    .from("abonnements")
    .update({ status: "active" })
    .eq("id", subscriptionId)
    .in("status", ["pending_payment", "trial", "grace_period"]);

  if (error) throw new Error(error.message);
}

/**
 * Passe un abonnement actif/trial → grace_period.
 * Délègue au RPC SQL.
 */
export async function enterGracePeriod(
  admin: SupabaseClient,
  subscriptionId: string,
  graceDays = 7,
): Promise<void> {
  const { error } = await admin.rpc("billing_enter_grace_period", {
    p_subscription_id: subscriptionId,
    p_grace_days: graceDays,
  });
  if (error) throw new Error(error.message);
}

/**
 * Passe en suspended tous les abonnements en grace_period expirée.
 * À appeler quotidiennement (cron Edge Function).
 */
export async function suspendExpiredSubscriptions(
  admin: SupabaseClient,
): Promise<{ to_grace: number; to_suspend: number; to_expire: number }> {
  const { data, error } = await admin.rpc("billing_run_daily_lifecycle");
  if (error) throw new Error(error.message);
  return data as { to_grace: number; to_suspend: number; to_expire: number };
}

/**
 * Résiliation manuelle d'un abonnement.
 */
export async function cancelSubscription(
  admin: SupabaseClient,
  subscriptionId: string,
  cancelledBy?: string,
): Promise<void> {
  const { error } = await admin.rpc("billing_cancel_subscription", {
    p_subscription_id: subscriptionId,
    p_cancelled_by: cancelledBy ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Retourne la règle d'accès pour un statut d'abonnement donné. */
export function getAccessRule(status: SubscriptionStatus): SubscriptionAccessRule {
  return SUBSCRIPTION_ACCESS[status] ?? SUBSCRIPTION_ACCESS.suspended;
}
