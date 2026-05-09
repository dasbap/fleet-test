import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans AuthProvider");
  }
  return ctx;
}
