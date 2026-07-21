import {
  Fragment,
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import {
  AUTH_FLOW_MAX_WAIT_MS,
  computeAuthFlowDecision,
  deriveAuthFlowStatus,
  detectFirstLogin,
  toAuthFlowDecisionSnapshot,
  type AuthFlowComputeResult,
} from "@/lib/auth-flow";
import { buildAuthContext } from "@/lib/build-auth-context";
import { computeAuthFlowPermissions } from "@/lib/auth-flow-permissions";
import { signIn as signInAction, signOut as signOutAction } from "@/lib/auth-actions";
import {
  getSafePostLoginPath,
  LEGACY_POST_LOGIN_REDIRECT_PARAM,
  POST_LOGIN_NEXT_PARAM,
} from "@/navigation/postLoginRedirect";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { RouteAccessRepository } from "@/repositories/route-access.repository";
import { FleetBillingRepository } from "@/repositories/fleet-billing.repository";
import { FleetBillingService } from "@/services/fleet-billing.service";
import type { PlanEnables, UseAuthFlowReturn } from "@/types/auth";

const routeAccessRepository = new RouteAccessRepository();
const fleetBillingRepository = new FleetBillingRepository();
const fleetBillingService = new FleetBillingService(fleetBillingRepository);

const EMPTY_ENABLES: PlanEnables = {
  finance: false,
  ai: false,
  reports: false,
  driver_scoring: false,
  anomaly_insights: false,
};

/**
 * Enveloppe racine (extension future : contexte partagé du flux auth).
 * Pour l’instant : rend les enfants sans état additionnel.
 */
export function AuthFlowProvider({ children }: { children: ReactNode }) {
  return createElement(Fragment, null, children);
}

export type { UseAuthFlowReturn } from "@/types/auth";

/**
 * Agrège auth Supabase, adhésions, onboarding, facturation et calcule la cible post-login.
 */
export function useAuthFlow(): UseAuthFlowReturn {
  const [searchParams] = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    user,
    session,
    memberships,
    orgId,
    activeTenantContext,
    tenantOptions,
    isLoading: authLoading,
    isTenantOrgLoading,
    refreshMemberships,
    refreshUser,
  } = useAuth();
  const { isAdmin, isLoading: isRoleAccessLoading } = useRoleAccess();

  const fleetId = activeTenantContext?.fleetId ?? null;
  const hasMemberships = memberships.length > 0;

  const safeNextPath = useMemo(() => {
    const fromNext = getSafePostLoginPath(searchParams.get(POST_LOGIN_NEXT_PARAM));
    const fromLegacy = getSafePostLoginPath(
      searchParams.get(LEGACY_POST_LOGIN_REDIRECT_PARAM),
    );
    const raw = fromNext ?? fromLegacy ?? ROUTE_PATHS.dashboard;
    return raw.startsWith(ROUTE_PATHS.postLogin) ? ROUTE_PATHS.dashboard : raw;
  }, [searchParams]);

  const { data: billing, isLoading: billingLoading } = useBilling(
    hasMemberships ? orgId : null,
    hasMemberships ? fleetId : null,
  );

  const onboardingQuery = useQuery({
    queryKey: ["auth-flow-onboarding-completed", orgId],
    queryFn: () => routeAccessRepository.isOnboardingCompleted(orgId as string),
    enabled: Boolean(hasMemberships && orgId),
    staleTime: 60 * 1000,
  });

  const fleetBillingQuery = useQuery({
    queryKey: ["fleet-billing-context", fleetId],
    queryFn: () => fleetBillingService.getFleetBillingContext(fleetId as string),
    enabled: Boolean(hasMemberships && orgId && fleetId),
    staleTime: 60_000,
  });

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), AUTH_FLOW_MAX_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  const orgAndFleetReady = !hasMemberships || Boolean(orgId && fleetId);
  const billingReady = !(orgId && fleetId) || !billingLoading;
  /** Sans orgId connu, on ne bloque pas sur l’onboarding (évite faux positifs au timeout). */
  const onboardingCompleted =
    !orgId || !hasMemberships
      ? true
      : onboardingQuery.isError
        ? false
        : (onboardingQuery.data ?? false);
  const onboardingReady =
    !hasMemberships || !orgId || (!onboardingQuery.isLoading && !onboardingQuery.isPending);

  const isReady =
    !authLoading &&
    !isRoleAccessLoading &&
    !isTenantOrgLoading &&
    (timedOut || (orgAndFleetReady && billingReady && onboardingReady));

  const decision = useMemo((): AuthFlowComputeResult | null => {
    if (!isReady) return null;
    return computeAuthFlowDecision({
      hasUser: Boolean(user),
      isPlatformAdmin: isAdmin,
      hasMemberships,
      userCreatedAt: user?.created_at,
      lastSignInAt: session?.user?.last_sign_in_at ?? null,
      onboardingCompleted,
      lapsedPaid: Boolean(billing?.lapsedPaid),
      role: activeTenantContext?.role ?? null,
      safeNextPath,
    });
  }, [
    isReady,
    user,
    isAdmin,
    hasMemberships,
    session?.user?.last_sign_in_at,
    onboardingCompleted,
    billing?.lapsedPaid,
    activeTenantContext?.role,
    safeNextPath,
  ]);

  const decisionSnapshot = useMemo(
    () => (decision ? toAuthFlowDecisionSnapshot(decision) : null),
    [decision],
  );

  const status = useMemo(
    () =>
      deriveAuthFlowStatus(
        authLoading,
        isTenantOrgLoading,
        isReady,
        Boolean(user),
        decision,
      ),
    [authLoading, isTenantOrgLoading, isReady, user, decision],
  );

  const isFirstLogin = useMemo(
    () =>
      detectFirstLogin(user?.created_at, session?.user?.last_sign_in_at ?? null),
    [user?.created_at, session?.user?.last_sign_in_at],
  );

  const fleetBillingReady =
    !hasMemberships ||
    !orgId ||
    !fleetId ||
    fleetBillingQuery.isFetched ||
    fleetBillingQuery.isError;

  const context = useMemo(() => {
    if (!user) {
      return null;
    }
    if (!isReady || !fleetBillingReady) {
      return null;
    }
    if (!hasMemberships) {
      return buildAuthContext({
        user,
        activeRole: null,
        orgId: null,
        fleetId: null,
        fleetName: null,
        fleetBilling: null,
        billing: billing ?? null,
      });
    }
    if (!orgId || !fleetId) {
      return null;
    }
    const fleetNameResolved =
      tenantOptions.find((t) => t.fleetId === fleetId)?.fleetName ?? null;
    return buildAuthContext({
      user,
      activeRole: activeTenantContext?.role ?? null,
      orgId,
      fleetId,
      fleetName: fleetNameResolved,
      fleetBilling: fleetBillingQuery.data ?? null,
      billing: billing ?? null,
    });
  }, [
    user,
    isReady,
    fleetBillingReady,
    hasMemberships,
    orgId,
    fleetId,
    tenantOptions,
    activeTenantContext?.role,
    fleetBillingQuery.data,
    billing,
  ]);

  const can = useMemo(
    () =>
      computeAuthFlowPermissions(
        context?.role ?? null,
        context?.enables ?? EMPTY_ENABLES,
      ),
    [context?.role, context?.enables],
  );

  const isLoading = useMemo(
    () =>
      authLoading ||
      isRoleAccessLoading ||
      isTenantOrgLoading ||
      (Boolean(user) && !isReady) ||
      (Boolean(user) && hasMemberships && Boolean(orgId && fleetId) && !fleetBillingReady),
    [
      authLoading,
      isRoleAccessLoading,
      isTenantOrgLoading,
      user,
      isReady,
      hasMemberships,
      orgId,
      fleetId,
      fleetBillingReady,
    ],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setFlowError(null);
    const { error } = await signInAction(email.trim(), password);
    if (error) {
      const msg =
        error instanceof Error ? error.message : "Connexion impossible.";
      setFlowError(msg);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setFlowError(null);
    const { error } = await signOutAction();
    if (error) {
      setFlowError(
        error instanceof Error ? error.message : "Déconnexion impossible.",
      );
    }
  }, []);

  const refreshContext = useCallback(async () => {
    setFlowError(null);
    await refreshUser();
    await refreshMemberships();
    await queryClient.invalidateQueries({ queryKey: ["billing-snapshot"] });
    await queryClient.invalidateQueries({ queryKey: ["fleet-billing-context"] });
    await queryClient.invalidateQueries({
      queryKey: ["auth-flow-onboarding-completed"],
    });
  }, [queryClient, refreshMemberships, refreshUser]);

  const aggregatedError = useMemo(() => {
    if (flowError) return flowError;
    if (onboardingQuery.isError) return "Impossible de vérifier l’onboarding.";
    if (fleetBillingQuery.isError) return "Impossible de charger le contexte facturation.";
    return null;
  }, [flowError, onboardingQuery.isError, fleetBillingQuery.isError]);

  return {
    status,
    context,
    isLoading,
    isFirstLogin,
    can,
    signIn,
    signOut,
    refreshContext,
    error: aggregatedError,
    decision: decisionSnapshot,
    isReady,
  };
}
