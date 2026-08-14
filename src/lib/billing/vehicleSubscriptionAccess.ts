import {
  getAllPlanAccess,
  type PlanAccessSummary,
} from "@/lib/billing/planGuards";
import type { SubscriptionSummary } from "@/services/subscription-management.service";
import type { BillingStatus, FleetBillingContext } from "@/types/fleet-billing";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["trial", "active", "grace", "grace_period", "enterprise"]);

export interface VehicleSubscriptionAccess {
  isCovered: boolean;
  subscription: SubscriptionSummary | undefined;
  billingCtx: FleetBillingContext;
  access: PlanAccessSummary;
}

export function getVehicleSubscriptionAccess(
  subscriptions: SubscriptionSummary[],
  vehicleId: string | undefined | null,
): VehicleSubscriptionAccess {
  const subscription = findActiveVehicleSubscription(subscriptions, vehicleId);
  const billingCtx = subscription
    ? subscriptionToBillingContext(subscription)
    : inactiveVehicleBillingContext();

  return {
    isCovered: !!subscription,
    subscription,
    billingCtx,
    access: getAllPlanAccess(billingCtx),
  };
}

export function findActiveVehicleSubscription(
  subscriptions: SubscriptionSummary[],
  vehicleId: string | undefined | null,
): SubscriptionSummary | undefined {
  if (!vehicleId) {
    return undefined;
  }

  return subscriptions.find((subscription) => {
    const status = subscription.status ?? "";
    return (
      ACTIVE_SUBSCRIPTION_STATUSES.has(status) &&
      subscription.vehicles.some((vehicle) => vehicle.id === vehicleId)
    );
  });
}

function subscriptionToBillingContext(subscription: SubscriptionSummary): FleetBillingContext {
  const planCode = subscription.planCode ?? "free";
  const vehicleCount = subscription.vehicleCount;
  const vehicleSlots = subscription.vehicleCapacity ?? subscription.vehicleSlots ?? vehicleCount;
  const isPaid = planCode !== "free" && ["trial", "active", "grace", "grace_period", "enterprise"].includes(subscription.status ?? "");

  return {
    planCode,
    planName: subscription.planName ?? planCode,
    isPaid,
    vehicleCount,
    activeVehicles: vehicleCount,
    vehicleSlots,
    maxVehicles: vehicleSlots,
    billingStatus: normalizeBillingStatus(subscription.status),
    trialEndsAt: subscription.status === "trial" ? subscription.endsAt : null,
    subscriptionEndsAt: subscription.endsAt,
    graceUntil: null,
    financeEnabled: subscription.financeEnabled,
    aiEnabled: subscription.aiEnabled,
    reportsEnabled: subscription.reportsEnabled,
    driverScoringEnabled: subscription.driverScoringEnabled,
    anomalyInsightsEnabled: subscription.anomalyInsightsEnabled,
    geofencingEnabled: subscription.geofencingEnabled,
    scheduledReportsEnabled: subscription.scheduledReportsEnabled,
    offlineDriverEnabled: subscription.offlineDriverEnabled,
  };
}

function inactiveVehicleBillingContext(): FleetBillingContext {
  return {
    planCode: "free",
    planName: "Aucun abonnement",
    isPaid: false,
    vehicleCount: 0,
    activeVehicles: 0,
    vehicleSlots: 0,
    maxVehicles: 0,
    billingStatus: "suspended",
    trialEndsAt: null,
    subscriptionEndsAt: null,
    graceUntil: null,
    financeEnabled: false,
    aiEnabled: false,
    reportsEnabled: false,
    driverScoringEnabled: false,
    anomalyInsightsEnabled: false,
    geofencingEnabled: false,
    scheduledReportsEnabled: false,
    offlineDriverEnabled: false,
  };
}

function normalizeBillingStatus(status: string | null | undefined): BillingStatus {
  if (status === "trial" || status === "active" || status === "enterprise") {
    return status;
  }
  if (status === "grace" || status === "grace_period") {
    return "grace";
  }
  return "suspended";
}
