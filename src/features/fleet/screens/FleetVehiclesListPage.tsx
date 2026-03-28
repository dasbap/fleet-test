import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Car, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageLoader } from "@/components/dashboard/PageLoader";
import VehicleFormDialog from "@/components/vehicles/VehicleFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import type { FleetVehicleFilterTab } from "@/types/fleet-vehicle";
import {
  MOCK_FLEET_USE_DEMO_DATA,
  MOCK_FLEET_VEHICLES,
} from "@/features/fleet/data/mockFleetVehicles";
import { filterFleetVehicleList } from "@/features/fleet/lib/filterFleetVehicles";
import { VehicleCard } from "@/features/fleet/components/VehicleCard";
import { cn } from "@/lib/utils";

const FILTER_TABS: { id: FleetVehicleFilterTab; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "available", label: "Disponible" },
  { id: "on_mission", label: "En mission" },
  { id: "stopped", label: "À l’arrêt" },
  { id: "maintenance", label: "Maintenance" },
];

/**
 * Liste des véhicules — filtres, recherche, cartes (données mock en démo).
 */
export default function FleetVehiclesListPage() {
  const { role, userFleetId, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userRole = role || "driver";
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [tab, setTab] = useState<FleetVehicleFilterTab>("all");
  const [search, setSearch] = useState("");

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  };

  const filtered = useMemo(
    () => filterFleetVehicleList(MOCK_FLEET_VEHICLES, tab, search),
    [tab, search]
  );

  if (authLoading) {
    return <PageLoader />;
  }

  if (!userFleetId) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Car className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Aucune flotte</h3>
            <p className="mb-4 text-muted-foreground">
              Rejoignez une flotte ou créez-en une pour afficher les véhicules.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Tableau de bord
              </Button>
              <Button onClick={() => navigate("/dashboard/create-fleet")}>
                Créer une flotte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showAdd =
    !MOCK_FLEET_USE_DEMO_DATA &&
    (userRole === "manager" || userRole === "organizer");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-0 sm:space-y-6 lg:max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
            Flotte — véhicules
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Statut, entretien, localisation et alertes du parc
          </p>
        </div>
        {showAdd && (
          <Button className="w-full shrink-0 gap-2 sm:w-auto" onClick={() => setIsFormOpen(true)}>
            Ajouter un véhicule
          </Button>
        )}
      </div>

      {MOCK_FLEET_USE_DEMO_DATA && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Données de démonstration</AlertTitle>
          <AlertDescription>
            Les véhicules affichés sont fictifs. Branchez le service API pour
            afficher vos données réelles.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={tab === id ? "default" : "outline"}
              onClick={() => setTab(id)}
              className="min-h-10 rounded-full touch-manipulation"
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Immatriculation, marque ou modèle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn("bg-background pl-9")}
            aria-label="Rechercher un véhicule"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun véhicule ne correspond à ces critères.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <li key={v.id}>
              <VehicleCard vehicle={v} />
            </li>
          ))}
        </ul>
      )}

      {!MOCK_FLEET_USE_DEMO_DATA &&
        (userRole === "manager" || userRole === "organizer") && (
          <VehicleFormDialog
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            fleetId={userFleetId}
            onSuccess={handleSuccess}
          />
        )}
    </div>
  );
}
