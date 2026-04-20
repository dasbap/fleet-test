import type { AuthFlowComputeInput } from "@/lib/auth-flow";
import type { AppRole } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Réponse JSON de `public.get_auth_flow_session_snapshot` (migration 20260420120000).
 * Les champs alimentent {@link computeAuthFlowDecision} sans dupliquer la logique de route.
 */
export interface UserSessionContextRpc {
  has_memberships: boolean;
  user_created_at: string | null;
  last_sign_in_at: string | null;
  /** Pour une org connue ; si pas d’adhésion, toujours true (aligné useAuthFlow). */
  onboarding_completed: boolean;
  /** Aligné sur computeLapsedPaidFromLatestSubscription. */
  lapsed_paid: boolean;
  role: AppRole | null;
  active_fleet_id: string | null;
  org_id: string | null;
}

/**
 * Construit l’entrée de {@link computeAuthFlowDecision} à partir du RPC.
 * `safeNextPath` reste fourni par le client (query params / défaut dashboard).
 */
export function authFlowComputeInputFromUserSessionContext(
  ctx: UserSessionContextRpc,
  safeNextPath: string,
): AuthFlowComputeInput {
  return {
    hasUser: true,
    hasMemberships: ctx.has_memberships,
    userCreatedAt: ctx.user_created_at ?? undefined,
    lastSignInAt: ctx.last_sign_in_at,
    onboardingCompleted: ctx.has_memberships ? ctx.onboarding_completed : true,
    lapsedPaid: ctx.lapsed_paid,
    role: ctx.role,
    safeNextPath,
  };
}

/**
 * Appelle la RPC (session JWT requise). `preferredFleetId` = flotte active persistée (ex. localStorage).
 */
export async function fetchAuthFlowSessionSnapshot(
  preferredFleetId: string | null,
): Promise<UserSessionContextRpc> {
  const { data, error } = await supabase.rpc("get_auth_flow_session_snapshot", {
    p_preferred_fleet_id: preferredFleetId,
  });
  if (error) {
    throw error;
  }
  return data as UserSessionContextRpc;
}
