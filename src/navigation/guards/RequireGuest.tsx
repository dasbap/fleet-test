import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthFlow } from "@/hooks/useAuthFlow";
import { ROUTE_PATHS } from "@/navigation/routePaths";

interface RequireGuestProps {
  children: ReactNode;
}

/**
 * Garde : accès réservé aux visiteurs non authentifiés (écrans de connexion / inscription).
 * Si session active : même aiguillage que PostLoginGate (`useAuthFlow` / `computeAuthFlowDecision`),
 * en tenant compte de `?next=` et de l’ancien `?redirect=` (voir `postLoginRedirect`).
 *
 * Exception PASSWORD_RECOVERY : si l’utilisateur a cliqué un lien de réinitialisation,
 * Supabase émet cet event et on redirige vers /auth/update-password sans déclencher
 * l’aiguillage dashboard/flotte/onboarding.
 */
export function RequireGuest({ children }: RequireGuestProps) {
  const { user, isLoading, isPasswordRecovery } = useAuth();
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

  // Flux reset password : ne pas appliquer l’aiguillage normal — aller directement au formulaire.
  if (isPasswordRecovery) {
    return <Navigate to={ROUTE_PATHS.updatePassword} replace />;
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
