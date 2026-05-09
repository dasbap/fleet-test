import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthFlow } from "@/hooks/useAuthFlow";

interface RequireGuestProps {
  children: ReactNode;
}

/**
 * Garde : accès réservé aux visiteurs non authentifiés (écrans de connexion / inscription).
 * Si session active : même aiguillage que PostLoginGate (`useAuthFlow` / `computeAuthFlowDecision`),
 * en tenant compte de `?next=` et de l’ancien `?redirect=` (voir `postLoginRedirect`).
 */
export function RequireGuest({ children }: RequireGuestProps) {
  const { user, isLoading } = useAuth();
  const { decision, isLoading: authFlowLoading } = useAuthFlow();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  if (authFlowLoading || !decision) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  return <Navigate to={decision.path} replace />;
}
