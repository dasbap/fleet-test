import type { ReactNode } from "react";
import { useMemo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROUTE_PATHS } from "@/navigation/routePaths";

interface RequireGuestProps {
  children: ReactNode;
}

/**
 * Garde : accès réservé aux visiteurs non authentifiés (écrans de connexion / inscription).
 * Redirige vers le tableau de bord ou `?redirect=` (chemin interne uniquement) si session active.
 */
export function RequireGuest({ children }: RequireGuestProps) {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();

  const redirectTo = useMemo(() => {
    const raw = searchParams.get("redirect");
    if (!raw || !raw.startsWith("/")) return ROUTE_PATHS.dashboard;
    return raw;
  }, [searchParams]);

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

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
