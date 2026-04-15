import { Car, MoreVertical, User, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useFleetVehicles } from "@/hooks/useDashboardStats";
import { FleetOverviewSkeleton } from "@/components/dashboard/FleetOverviewSkeleton";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/mobile/ui";

// Note: Le statut "Actif" nécessite maintenant une assignation active
// Ceci sera géré dans le composant en vérifiant hasActiveAssignment
const statusConfig = {
  ok: { label: "Disponible", className: "bg-muted text-muted-foreground" },
  blocked: { label: "Bloqué", className: "bg-destructive text-destructive-foreground" },
};

const FleetOverview = () => {
  const { data: vehicles, isLoading } = useFleetVehicles();
  const navigate = useNavigate();

  if (isLoading) {
    return <FleetOverviewSkeleton />;
  }

  return (
    <Card className="h-full min-h-[26rem]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Aperçu de la flotte</CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/vehicles')}>
          Voir tout
        </Button>
      </CardHeader>
      <CardContent>
        {!vehicles || vehicles.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/20 min-h-[18rem]">
            <EmptyState
              icon={Car}
              title="Aucun véhicule dans la flotte"
              description="Ajoutez un véhicule pour suivre les statuts, les kilomètres et les alertes de maintenance."
              actionLabel="Ajouter un véhicule"
              onAction={() => navigate('/dashboard/vehicles')}
            />
          </div>
        ) : (
          <div className="space-y-4 min-h-[18rem]">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {/* Vehicle Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                  vehicle.status === 'ok' ? "bg-primary/10" : "bg-destructive/10"
                )}>
                  {vehicle.status === 'blocked' ? (
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  ) : (
                    <Car className="w-6 h-6 text-primary" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{vehicle.registration}</span>
                    <Badge
                      className={cn(
                        vehicle.status === 'blocked' 
                          ? statusConfig.blocked.className
                          : (vehicle as { hasActiveAssignment?: boolean }).hasActiveAssignment
                            ? "bg-success text-success-foreground"
                            : statusConfig.ok.className
                      )}
                    >
                      {vehicle.status === 'blocked' 
                        ? statusConfig.blocked.label
                        : (vehicle as { hasActiveAssignment?: boolean }).hasActiveAssignment
                          ? "Actif"
                          : statusConfig.ok.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{vehicle.driver || 'Non assigné'}</span>
                    </div>
                  </div>
                  {vehicle.blocked_reason && (
                    <p className="text-xs text-destructive mt-1">{vehicle.blocked_reason}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-sm font-medium">{(vehicle.current_km || 0).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">km</div>
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/dashboard/vehicles')}>
                      Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/maintenance')}>
                      Historique maintenance
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FleetOverview;
