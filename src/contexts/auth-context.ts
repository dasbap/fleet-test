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
  setActiveFleetId: (fleetId: string) => void;
  refreshMemberships: () => Promise<FleetMembership[]>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
