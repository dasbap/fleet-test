/**
 * Guards d'accès plan — fonctions pures de lecture seule.
 *
 * Source de vérité : FleetBillingContext (chargé depuis Supabase).
 * Ces helpers ne remplacent PAS les RPCs serveur (can_create_vehicle, get_plan_access).
 * Ils permettent uniquement d'afficher/masquer des éléments UI côté client.
 *
 * Règle absolue : jamais d'activation d'abonnement depuis le frontend.
 */

import type { FleetBillingContext } from "@/types/fleet-billing";

// ─── Types ─────────────────────────────────────────────────────────────────

export type PlanCode = "free" | "starter" | "pro" | "enterprise" | "organizer";

export interface PlanAccessResult {
  allowed: boolean;
  /** Message d'upgrade affiché dans le PaywallOverlay si !allowed. */
  upgradeMessage?: string;
  /** Code du plan minimum requis. */
  requiredPlan?: PlanCode;
}

// ─── Helpers internes ──────────────────────────────────────────────────────

function isPlanAtLeast(ctx: FleetBillingContext, min: PlanCode): boolean {
  const order: PlanCode[] = ["free", "starter", "pro", "enterprise", "organizer"];
  const currentIdx = order.indexOf(ctx.planCode as PlanCode);
  const minIdx = order.indexOf(min);
  return currentIdx >= minIdx;
}

function isSubscriptionActive(ctx: FleetBillingContext): boolean {
  return ["trial", "active", "grace", "grace_period", "enterprise"].includes(ctx.billingStatus);
}

function isOrganizerTier(ctx: FleetBillingContext): boolean {
  return ctx.planCode === "organizer" || ctx.planCode === "enterprise";
}

// ─── Guards publics ────────────────────────────────────────────────────────

/**
 * Peut créer un véhicule supplémentaire ?
 * Mirror du RPC serveur `can_create_vehicle` — pour l'affichage UI uniquement.
 * La vraie vérification se fait côté DB avant chaque INSERT.
 */
export function canCreateVehicle(ctx: FleetBillingContext): PlanAccessResult {
  if (!isSubscriptionActive(ctx)) {
    return {
      allowed: false,
      upgradeMessage: "Votre abonnement est inactif. Renouvelez pour ajouter des véhicules.",
      requiredPlan: "starter",
    };
  }

  const effectiveVehicleLimit = Math.min(ctx.vehicleSlots, ctx.maxVehicles);
  const atMax = ctx.vehicleCount >= effectiveVehicleLimit;
  if (atMax) {
    return {
      allowed: false,
      upgradeMessage: `Limite de ${effectiveVehicleLimit} véhicule${effectiveVehicleLimit > 1 ? "s" : ""} atteinte. Passez à un plan supérieur pour en ajouter davantage.`,
      requiredPlan: isPlanAtLeast(ctx, "pro") ? "organizer" : "pro",
    };
  }

  return { allowed: true };
}

/**
 * Peut utiliser Pulse+ (IA prédictive, scoring anomalies) ?
 * Disponible uniquement à partir du plan Pro.
 */
export function canUsePulse(ctx: FleetBillingContext): PlanAccessResult {
  if (!isSubscriptionActive(ctx)) {
    return {
      allowed: false,
      upgradeMessage: "Abonnement requis pour accéder à Pulse+.",
      requiredPlan: "pro",
    };
  }

  if (!ctx.aiEnabled) {
    return {
      allowed: false,
      upgradeMessage: "Pulse+ (alertes prédictives et scoring IA) est disponible à partir du plan Pro.",
      requiredPlan: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Peut utiliser QR Premium (génération lot + activation terrain) ?
 * Disponible à partir du plan Pro.
 */
export function canUseQrPremium(ctx: FleetBillingContext): PlanAccessResult {
  if (!isSubscriptionActive(ctx)) {
    return {
      allowed: false,
      upgradeMessage: "Abonnement requis pour les QR codes d'activation.",
      requiredPlan: "pro",
    };
  }

  const allowed = isPlanAtLeast(ctx, "pro");
  if (!allowed) {
    return {
      allowed: false,
      upgradeMessage: "Les QR codes d'activation en lot sont disponibles à partir du plan Pro.",
      requiredPlan: "pro",
    };
  }

  return { allowed: true };
}

/**
 * Peut exporter des rapports (PDF, Excel, rapports programmés) ?
 * Disponible à partir du plan Starter.
 */
export function canExportReports(ctx: FleetBillingContext): PlanAccessResult {
  if (!isSubscriptionActive(ctx)) {
    return {
      allowed: false,
      upgradeMessage: "Abonnement requis pour exporter des rapports.",
      requiredPlan: "starter",
    };
  }

  if (!ctx.reportsEnabled) {
    return {
      allowed: false,
      upgradeMessage: "L'export de rapports (PDF, Excel) est disponible à partir du plan Starter.",
      requiredPlan: "starter",
    };
  }

  return { allowed: true };
}

/**
 * Peut utiliser le module Finance (facturation, collectes, trésorerie) ?
 * Disponible à partir du plan Starter.
 */
export function canUseFinance(ctx: FleetBillingContext): PlanAccessResult {
  if (!isSubscriptionActive(ctx)) {
    return {
      allowed: false,
      upgradeMessage: "Abonnement requis pour le module Finance.",
      requiredPlan: "starter",
    };
  }

  if (!ctx.financeEnabled) {
    return {
      allowed: false,
      upgradeMessage: "Le module Finance (facturation et collectes) est disponible à partir du plan Starter.",
      requiredPlan: "starter",
    };
  }

  return { allowed: true };
}

/**
 * Peut gérer plusieurs flottes (dashboard global, multi-tenant) ?
 * Réservé au plan Enterprise (Organizer).
 */
export function canAccessMultiFleet(ctx: FleetBillingContext): PlanAccessResult {
  if (!isSubscriptionActive(ctx)) {
    return {
      allowed: false,
      upgradeMessage: "Abonnement Enterprise requis pour la gestion multi-flottes.",
      requiredPlan: "organizer",
    };
  }

  const allowed = isOrganizerTier(ctx);
  if (!allowed) {
    return {
      allowed: false,
      upgradeMessage: "La gestion multi-flottes et le dashboard global sont réservés au plan Organizer (Enterprise). Contactez-nous pour un devis.",
      requiredPlan: "organizer",
    };
  }

  return { allowed: true };
}

/**
 * Peut utiliser le scoring de conducteurs ?
 * Disponible à partir du plan Starter.
 */
export function canUseDriverScoring(ctx: FleetBillingContext): PlanAccessResult {
  if (!ctx.driverScoringEnabled) {
    return {
      allowed: false,
      upgradeMessage: "Le scoring conducteur est disponible à partir du plan Starter.",
      requiredPlan: "starter",
    };
  }
  return { allowed: true };
}

// ─── Agrégat complet des droits ────────────────────────────────────────────

export interface PlanAccessSummary {
  createVehicle: PlanAccessResult;
  pulse: PlanAccessResult;
  qrPremium: PlanAccessResult;
  exportReports: PlanAccessResult;
  finance: PlanAccessResult;
  multiFleet: PlanAccessResult;
  driverScoring: PlanAccessResult;
}

export function getAllPlanAccess(ctx: FleetBillingContext): PlanAccessSummary {
  return {
    createVehicle:  canCreateVehicle(ctx),
    pulse:          canUsePulse(ctx),
    qrPremium:      canUseQrPremium(ctx),
    exportReports:  canExportReports(ctx),
    finance:        canUseFinance(ctx),
    multiFleet:     canAccessMultiFleet(ctx),
    driverScoring:  canUseDriverScoring(ctx),
  };
}
