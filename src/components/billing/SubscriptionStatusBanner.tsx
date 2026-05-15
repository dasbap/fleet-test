import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG = {
  info:    { icon: Info,          className: "border-blue-200 bg-blue-50 text-blue-800" },
  warning: { icon: AlertTriangle, className: "border-amber-200 bg-amber-50 text-amber-800" },
  error:   { icon: XCircle,       className: "border-red-200 bg-red-50 text-red-800" },
  muted:   { icon: Clock,         className: "border-border bg-muted/40 text-muted-foreground" },
} as const;

interface SubscriptionStatusBannerProps {
  /** Ne pas afficher si le statut est active. */
  hideWhenActive?: boolean;
  className?: string;
}

/**
 * Bannière contextuelle affichée selon le statut de l'abonnement.
 * À placer en haut du dashboard ou des pages protégées.
 */
export function SubscriptionStatusBanner({
  hideWhenActive = true,
  className,
}: SubscriptionStatusBannerProps) {
  const access = useSubscriptionAccess();

  if (access.isLoading) return null;
  if (!access.status) return null;
  if (hideWhenActive && access.status === "active") return null;
  if (!access.message) return null;

  const { icon: Icon, className: severityCls } = SEVERITY_CONFIG[access.severity];

  return (
    <Alert className={cn("flex items-start gap-3 rounded-xl border p-4", severityCls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <AlertDescription className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm">{access.message}</span>
        {access.needsUpgrade && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-current"
            asChild
          >
            <Link to={ROUTE_PATHS.upgrade}>Renouveler</Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
