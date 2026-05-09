import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getLoginPathPreservingReturn } from "@/navigation/loginRedirectPath";

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Garde : utilisateur authentifié. Sinon redirection vers la page de connexion.
 * À utiliser comme wrapper d’élément de route ou de sous-arbre.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const loginWithReturn = getLoginPathPreservingReturn(location);

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
    return <Navigate to={loginWithReturn} replace />;
  }

  return <>{children}</>;
}
