import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Associe l’utilisateur connecté à PostHog (sans PII) et réinitialise à la déconnexion.
 * Import dynamique pour ne pas gonfler le bundle initial.
 */
export function AnalyticsUserSync() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const userId = user?.id;
    import("@/lib/analytics").then(({ identifyAnalyticsUser }) => identifyAnalyticsUser(userId));
  }, [user?.id, isLoading]);

  return null;
}
