import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useVehicleList } from "@/hooks/useVehicles";
import { VehicleGpsTrackerDialog } from "@/components/vehicles/VehicleGpsTrackerDialog";

export function VehicleGpsManagementSection() {
  const { userFleetId } = useAuth();
  const { rbac, isSuperAdmin } = useRoleAccess();
  const canManageGps = rbac.fleetRole === "organizer" || isSuperAdmin;
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: vehicles = [], isLoading } = useVehicleList({
    fleet_id: userFleetId ?? undefined,
  });

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  if (!canManageGps || !userFleetId) return null;

  return (
    <section className="mx-auto mt-5 w-full xl:max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" aria-hidden />
            Traceurs GPS des véhicules
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            L'organisateur peut associer ou remplacer un boîtier GPS sans intervention d'un administrateur.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <span className="text-sm font-medium">Véhicule</span>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId} disabled={isLoading}>
              <SelectTrigger aria-label="Choisir un véhicule pour le GPS">
                <SelectValue placeholder={isLoading ? "Chargement…" : "Choisir un véhicule"} />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration} · {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Véhicule"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            className="gap-2"
            disabled={!selectedVehicle}
            onClick={() => setDialogOpen(true)}
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Configurer le GPS
          </Button>
        </CardContent>
      </Card>

      {selectedVehicle ? (
        <VehicleGpsTrackerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          vehicleId={selectedVehicle.id}
          registration={selectedVehicle.registration}
        />
      ) : null}
    </section>
  );
}
