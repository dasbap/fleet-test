import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Car, CheckCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVehicleDetail, type VehicleStatus } from "@/hooks/useVehicles";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { cn } from "@/lib/utils";

const statusLabel = (status: VehicleStatus, hasAssignment: boolean) => {
  if (status === "blocked") return "Bloqué";
  if (hasAssignment) return "Actif";
  return "Disponible";
};

export default function VehicleDetail() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const { data: vehicle, isLoading, isError } = useVehicleDetail(vehicleId);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !vehicle) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/vehicles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la flotte
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Véhicule introuvable ou accès refusé.
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAssignment = !!vehicle.active_assignment;
  const st = vehicle.status as VehicleStatus;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" type="button" onClick={() => navigate(-1)} aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-xl font-bold">Fiche véhicule</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Car className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="font-heading text-lg">
              {vehicle.brand} {vehicle.model}
            </CardTitle>
            <p className="mt-1 font-mono text-lg font-semibold">{vehicle.registration}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn(
                  st === "blocked"
                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                    : hasAssignment
                      ? "border-success/20 bg-success/10 text-success"
                      : ""
                )}
              >
                {st === "blocked" ? (
                  <AlertCircle className="mr-1 h-3 w-3" />
                ) : (
                  <CheckCircle className="mr-1 h-3 w-3" />
                )}
                {statusLabel(st, hasAssignment)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Année</span>
              <p className="font-medium">{vehicle.year ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Kilométrage</span>
              <p className="font-medium">{vehicle.current_km.toLocaleString("fr-FR")} km</p>
            </div>
            <div>
              <span className="text-muted-foreground">Conducteur assigné</span>
              {vehicle.active_assignment?.driver?.full_name ? (
                <p className="flex items-center gap-2 font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {vehicle.active_assignment.driver.full_name}
                </p>
              ) : (
                <p className="text-muted-foreground">Non assigné</p>
              )}
            </div>
            {vehicle.blocked_reason && (
              <div>
                <span className="text-muted-foreground">Motif de blocage</span>
                <p className="font-medium">{vehicle.blocked_reason}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
