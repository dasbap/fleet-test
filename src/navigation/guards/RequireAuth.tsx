import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROUTE_PATHS } from "@/navigation/routePaths";

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Garde : utilisateur authentifié. Sinon redirection vers la page de connexion.
 * À utiliser comme wrapper d’élément de route ou de sous-arbre.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();

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
    return <Navigate to={ROUTE_PATHS.auth} replace />;
  }

  return <>{children}</>;
}
