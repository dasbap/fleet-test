import { Link } from "react-router-dom";
import { AlertTriangle, FileWarning } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useExpiringVehicleDocuments,
  usePendingClosures,
} from "@/hooks/useFleetCompliance";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { cn } from "@/lib/utils";

interface BannerProps {
  fleetId?: string | null;
  compact?: boolean;
}

export function ClosureBanner({ fleetId, compact = false }: BannerProps) {
  const { data = [] } = usePendingClosures(fleetId ?? undefined);
  const pendingCount = data.length;

  if (!fleetId || pendingCount === 0) {
    return null;
  }

  return (
    <Alert className={cn("border-amber-500/40 bg-amber-500/5", compact && "p-3")}>
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="flex items-center gap-2">
        Clôtures à valider
        <Badge variant="warning">{pendingCount}</Badge>
      </AlertTitle>
      <AlertDescription className={cn(compact ? "text-xs" : "text-sm")}>
        {pendingCount} clôture{pendingCount > 1 ? "s" : ""} de créneau attend
        {pendingCount > 1 ? "ent" : ""} une validation.
        <div className="mt-2">
          <Button asChild size={compact ? "sm" : "default"} variant="outline">
            <Link to={ROUTE_PATHS.dashboardShiftClosure}>Traiter les clôtures</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function ExpiringDocumentsBanner({ fleetId, compact = false }: BannerProps) {
  const { data = [] } = useExpiringVehicleDocuments(fleetId ?? undefined, 30);
  const documentsCount = data.length;

  if (!fleetId || documentsCount === 0) {
    return null;
  }

  return (
    <Alert className={cn("border-red-500/40 bg-red-500/5", compact && "p-3")}>
      <FileWarning className="h-4 w-4 text-red-500" />
      <AlertTitle className="flex items-center gap-2">
        Documents à échéance proche
        <Badge variant="destructive">{documentsCount}</Badge>
      </AlertTitle>
      <AlertDescription className={cn(compact ? "text-xs" : "text-sm")}>
        {documentsCount} document{documentsCount > 1 ? "s" : ""} expire
        {documentsCount > 1 ? "nt" : ""} sous 30 jours.
        <div className="mt-2">
          <Button asChild size={compact ? "sm" : "default"} variant="outline">
            <Link to={ROUTE_PATHS.dashboardVehicles}>Voir les véhicules concernés</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
