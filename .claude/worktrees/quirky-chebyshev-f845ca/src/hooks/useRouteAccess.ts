import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { isMockAuthEnabled } from "@/lib/authMode";
import { AUTH_FLOW_MAX_WAIT_MS, detectFirstLogin } from "@/lib/auth-flow";
import { computePlanGate } from "@/lib/compute-plan-gate";
import type { RouteAccessResult } from "@/services/route-access.service";
import { RouteAccessRepository } from "@/repositories/route-access.repository";

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
    !Boolean(orgId && fleetId) ||
    (!billingQuery.isLoading && !billingQuery.isPending);
  const fleetBillingReady =
    !Boolean(fleetId) ||
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
  const firstLogin = detectFirstLogin(
    user.created_at,
    session?.user?.last_sign_in_at ?? null,
  );
  const role = activeTenantContext?.role ?? null;
  const isFleetAdmin = role === "organizer" || role === "manager";

  if ((firstLogin || !onboardingCompleted) && isFleetAdmin) {
    return { state: "onboarding", orgId };
  }

  const planGate = computePlanGate(
    fleetBillingQuery.data ?? null,
    billingQuery.data ?? null,
  );
  if (planGate.plan_expired) {
    return { state: "upgrade", orgId };
  }

  return { state: "ready", orgId };
}
