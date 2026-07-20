import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";

export function useAuthContextOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuthContext(): AuthContextValue {
  const ctx = useAuthContextOptional();
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans AuthProvider");
  }
  return ctx;
}
