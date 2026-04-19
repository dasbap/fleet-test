/**
 * Point d’entrée types auth / flux post-connexion (réexport pour imports unifiés).
 */
export type { AppRole, AuthUser, FleetMembership } from "@/types/auth";
export type {
  AuthFlowComputeInput,
  AuthFlowComputeResult,
  AuthFlowReason,
} from "@/lib/auth-flow";
