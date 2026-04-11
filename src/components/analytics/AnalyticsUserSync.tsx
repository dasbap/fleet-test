import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { identifyAnalyticsUser } from "@/lib/analytics";

/**
 * Associe l’utilisateur connecté à PostHog (sans PII) et réinitialise à la déconnexion.
 */
export function AnalyticsUserSync() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    identifyAnalyticsUser(user?.id);
  }, [user?.id, isLoading]);

  return null;
}
