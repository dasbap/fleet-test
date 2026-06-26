import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWaitForProfileReady } from "@/hooks/useWaitForProfileReady";
import { toast } from "@/hooks/use-toast";
import { getLoginPathPreservingReturn } from "@/navigation/loginRedirectPath";

interface RequireAuthProps {
  children: ReactNode;
}

function AuthLoadingSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-background">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
    </div>
  );
}

/**
 * Garde : utilisateur authentifié. Sinon redirection vers la page de connexion.
 * À utiliser comme wrapper d’élément de route ou de sous-arbre.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const { isPending, timedOut } = useWaitForProfileReady(user);
  const location = useLocation();
  const loginWithReturn = getLoginPathPreservingReturn(location);
  const timeoutToastShown = useRef(false);

  useEffect(() => {
    if (!timedOut || timeoutToastShown.current) {
      return;
    }
    timeoutToastShown.current = true;
    toast({
      title: "Profil en cours de préparation",
      description:
        "Votre profil met plus de temps que prévu à être initialisé. Si le problème persiste, contactez le support.",
      variant: "destructive",
    });
  }, [timedOut]);

  if (isLoading || (user && isPending)) {
    return <AuthLoadingSpinner />;
  }

  if (!user) {
    return <Navigate to={loginWithReturn} replace />;
  }

  return <>{children}</>;
}
