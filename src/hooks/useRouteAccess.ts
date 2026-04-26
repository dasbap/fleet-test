import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { isMockAuthEnabled } from "@/lib/authMode";
import { AUTH_FLOW_MAX_WAIT_MS, computeAuthFlowDecision } from "@/lib/auth-flow";
import { computePlanGate } from "@/lib/compute-plan-gate";
import type { RouteAccessResult } from "@/services/route-access.service";
import { RouteAccessRepository } from "@/repositories/route-access.repository";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const routeAccessRepository = new RouteAccessRepository();

export function useRouteAccess(): RouteAccessResult {
  const {
    user,
    session,
    orgId,
    memberships,
    activeTenantContext,
    isLoading,
    isTenantOrgLoading,
  } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), AUTH_FLOW_MAX_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  const hasMemberships = memberships.length > 0;
  const fleetId = activeTenantContext?.fleetId ?? null;

  const billingQuery = useBilling(
    hasMemberships ? orgId : null,
    hasMemberships ? fleetId : null,
  );
  const fleetBillingQuery = useFleetBillingContext(fleetId ?? undefined);

  const onboardingQuery = useQuery({
    queryKey: ["auth-flow-onboarding-completed", orgId],
    queryFn: () => routeAccessRepository.isOnboardingCompleted(orgId as string),
    enabled: Boolean(hasMemberships && orgId),
    staleTime: 60 * 1000,
  });

  const orgAndFleetReady = !hasMemberships || Boolean(orgId && fleetId);
  const billingReady =
    !(orgId && fleetId) ||
    (!billingQuery.isLoading && !billingQuery.isPending);
  const fleetBillingReady =
    !fleetId ||
    (!fleetBillingQuery.isLoading && !fleetBillingQuery.isPending);
  const onboardingReady =
    !hasMemberships ||
    !orgId ||
    (!onboardingQuery.isLoading && !onboardingQuery.isPending);

  const dataReady =
    timedOut ||
    (orgAndFleetReady &&
      billingReady &&
      fleetBillingReady &&
      onboardingReady);

  if (isLoading) {
    return { state: "loading", orgId: null };
  }

  /** Session mockée : pas d'organisation Supabase ; le dashboard reste utilisable (démo / E2E). */
  if (isMockAuthEnabled() && user?.id) {
    return { state: "ready", orgId: null };
  }

  if (!user?.id) {
    return { state: "unauth", orgId: null };
  }

  if (memberships.length === 0) {
    return { state: "tenant_bootstrap", orgId: null };
  }

  if (!orgId || !fleetId) {
    return { state: "loading", orgId: null };
  }

  if (isTenantOrgLoading || !dataReady) {
    return { state: "loading", orgId };
  }

  const onboardingCompleted = onboardingQuery.isError
    ? false
    : (onboardingQuery.data ?? false);

  const planGate = computePlanGate(
    fleetBillingQuery.data ?? null,
    billingQuery.data ?? null,
  );

  const decision = computeAuthFlowDecision({
    hasUser: Boolean(user?.id),
    hasMemberships: memberships.length > 0,
    userCreatedAt: user.created_at,
    lastSignInAt: session?.user?.last_sign_in_at ?? null,
    onboardingCompleted,
    lapsedPaid: planGate.plan_expired,
    role: activeTenantContext?.role ?? null,
    safeNextPath: ROUTE_PATHS.dashboard,
  });

  if (decision.path === ROUTE_PATHS.onboarding) {
    return { state: "onboarding", orgId };
  }

  if (decision.path === ROUTE_PATHS.upgrade) {
    return { state: "upgrade", orgId };
  }

  return { state: "ready", orgId };
}
