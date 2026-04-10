import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppRole, AuthUser, FleetMembership } from "@/types/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  role: AppRole | null;
  memberships: FleetMembership[];
  userFleetId: string | null;
  orgId: string | null;
  isLoading: boolean;
  refreshMemberships: () => Promise<FleetMembership[]>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
