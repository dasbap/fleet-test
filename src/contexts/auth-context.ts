import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppRole, AuthUser, FleetMembership } from "@/types/auth";

export interface ActiveTenantContext {
  orgId: string;
  fleetId: string;
  role: AppRole;
}

export interface TenantOption extends ActiveTenantContext {
  fleetName: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  role: AppRole | null;
  memberships: FleetMembership[];
  userFleetId: string | null;
  orgId: string | null;
  activeTenantContext: ActiveTenantContext | null;
  tenantOptions: TenantOption[];
  isLoading: boolean;
  /** True tant que les flottes / org ne sont pas résolues après chargement des adhésions. */
  isTenantOrgLoading: boolean;
  /**
   * True quand Supabase a émis l'event PASSWORD_RECOVERY (clic lien email reset).
   * Dans ce mode, l'utilisateur est authentifié temporairement pour changer son mot de passe
   * uniquement — aucun accès aux fonctionnalités dashboard.
   */
  isPasswordRecovery: boolean;
  setActiveFleetId: (fleetId: string) => void;
  refreshMemberships: () => Promise<FleetMembership[]>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
