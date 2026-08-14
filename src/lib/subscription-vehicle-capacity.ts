const ACTIVE_CAPACITY_STATUSES = new Set([
  "trial",
  "trialing",
  "active",
  "grace",
  "grace_period",
]);

interface SubscriptionCapacityLike {
  status?: string | null;
  vehicleCapacity?: number | null;
}

export function sumActiveSubscriptionVehicleCapacity(
  subscriptions: SubscriptionCapacityLike[],
): number | null {
  let total = 0;
  let hasActiveSubscription = false;

  for (const subscription of subscriptions) {
    if (!ACTIVE_CAPACITY_STATUSES.has(subscription.status ?? "")) {
      continue;
    }

    hasActiveSubscription = true;

    if (subscription.vehicleCapacity === null || subscription.vehicleCapacity === undefined) {
      return 999_999;
    }

    if (subscription.vehicleCapacity >= 999_999) {
      return 999_999;
    }

    total += Math.max(0, subscription.vehicleCapacity);
  }

  return hasActiveSubscription ? total : null;
}

export function resolveEffectiveVehicleSlots({
  subscriptionSlots,
  contextSlots,
  planMax,
}: {
  subscriptionSlots?: number | null;
  contextSlots: number;
  planMax: number;
}): number {
  const purchasedSlots = subscriptionSlots && subscriptionSlots > 0
    ? subscriptionSlots
    : contextSlots;

  return Math.max(1, Math.min(purchasedSlots, planMax || purchasedSlots));
}
