import type {
  AppRole,
  AuthContext,
  AuthUser,
  PlanEnables,
  UserRole,
} from "@/types/auth";
import type { FleetBillingContext } from "@/types/fleet-billing";
import type { BillingSnapshot } from "@/services/billing.service";
import {
  fleetBillingMaxVehiclesOrNull,
  fleetBillingToPlanEnables,
} from "@/lib/fleet-billing-plan-enables";
import {
  computePlanGate,
  DEFAULT_FLEET_BILLING_CONTEXT,
} from "@/lib/compute-plan-gate";

function displayNameFromUser(user: AuthUser): string {
  const meta = user.user_metadata;
  if (meta && typeof meta === "object") {
    const full = meta.full_name;
    if (typeof full === "string" && full.trim()) {
      return full.trim();
    }
    const name = meta.name;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }
  if (user.email?.trim()) {
    return user.email.trim();
  }
  return "Utilisateur";
}

function toUserRole(role: AppRole | null): UserRole {
  return role ?? "visitor";
}

export interface BuildAuthContextInput {
  user: AuthUser;
  /** Rôle sur la flotte active (adhésion). */
  activeRole: AppRole | null;
  orgId: string | null;
  fleetId: string | null;
  fleetName: string | null;
  /** Contexte RPC facturation ; si absent, valeurs par défaut « free ». */
  fleetBilling: FleetBillingContext | null;
  /** Snapshot abonnements (expiration / lapsed). */
  billing: BillingSnapshot | null;
}

/**
 * Construit un `AuthContext` unifié côté client (équivalent cible RPC `get_auth_context`).
 */
export function buildAuthContext(input: BuildAuthContextInput): AuthContext {
  const {
    user,
    activeRole,
    orgId,
    fleetId,
    fleetName,
    fleetBilling,
    billing,
  } = input;

  const fb = fleetBilling ?? DEFAULT_FLEET_BILLING_CONTEXT;
  const enables: PlanEnables = fleetBillingToPlanEnables(fb);
  const { planCode, plan_expired, plan_active } = computePlanGate(
    fleetBilling,
    billing,
  );

  return {
    user_id: user.id,
    full_name: displayNameFromUser(user),
    phone: user.phone ?? null,
    role: toUserRole(activeRole),
    fleet_id: fleetId,
    fleet_name: fleetName,
    org_id: orgId,
    plan_code: planCode,
    plan_active,
    plan_expired,
    enables,
    max_vehicles: fleetBillingMaxVehiclesOrNull(fb.maxVehicles),
  };
}
