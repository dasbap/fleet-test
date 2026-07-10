import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Car, UserMinus, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/dashboard/PageLoader";
import VehicleFormDialog from "@/components/vehicles/VehicleFormDialog";
import { AssignmentFormDialog } from "@/components/vehicles/AssignmentFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useQueryClient } from "@tanstack/react-query";
import { useEndAssignment } from "@/hooks/useAssignments";
import { useVehicleList, type VehicleStatusApi } from "@/hooks/useVehicles";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { cn } from "@/lib/utils";
import {
  mobileScreenRootList,
  mobileScreenStack,
  mobileScreenSubtitle,
  mobileScreenTitle,
} from "@/lib/mobile/mobileUiTokens";

type StatusFilter = "all" | VehicleStatusApi;

const FILTER_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "ok", label: "Actif" },
  { id: "blocked", label: "Bloqué" },
];

/**
 * Liste des véhicules (desktop + mobile): recherche, filtre statut, prochain entretien.
 */
export default function FleetVehiclesListPage() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { canWriteFleet } = usePermissions();
  const { can } = useRoleAccess();
  const canAssignDriver = can("vehicle.assign_driver");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const endAssignment = useEndAssignment();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  };

  const openAssignDialog = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setAssignDialogOpen(true);
  };

  const handleEndAssignment = async (assignmentId: string, driverName?: string) => {
    const confirmed = window.confirm(
      `Delier ${driverName || "ce chauffeur"} de ce vehicule ?`,
    );
    if (!confirmed) return;
    try {
      await endAssignment.mutateAsync(assignmentId);
    } catch {
      // Toast handled by the mutation.
    }
  };

  const listFilters = useMemo(
    () => ({
      fleet_id: userFleetId ?? undefined,
      search,
      status: tab === "all" ? undefined : tab,
    }),
    [userFleetId, search, tab]
  );

  const { data: vehicles = [], isLoading, error } = useVehicleList(listFilters);

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

  const showAdd = canWriteFleet;

  return (
    <div
      className={cn(
        mobileScreenRootList,
        mobileScreenStack,
        "xl:max-w-7xl",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(mobileScreenTitle, "md:text-3xl")}>Flotte — véhicules</h1>
          <p className={cn(mobileScreenSubtitle, "mt-1.5")}>
            Statut, entretien, localisation et alertes du parc
          </p>
        </div>
        {showAdd && (
          <Button className="w-full shrink-0 gap-2 sm:w-auto" onClick={() => setIsFormOpen(true)}>
            Ajouter un véhicule
          </Button>
        )}
      </div>

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

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Chargement des véhicules...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            Impossible de charger les véhicules pour le moment.
          </CardContent>
        </Card>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun véhicule ne correspond à ces critères.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => {
            const driverName = v.active_assignment?.driver?.full_name?.trim();
            return (
              <li key={v.id}>
                <Card className="h-full">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        onClick={() => navigate(ROUTE_PATHS.dashboardVehicleDetail(v.id))}
                      >
                        <p className="font-mono text-base font-semibold">{v.registration}</p>
                        <p className="text-sm text-muted-foreground">
                          {[v.brand, v.model].filter(Boolean).join(" ")}
                        </p>
                      </button>
                      <Badge variant={v.status === "blocked" ? "destructive" : "secondary"}>
                        {v.status === "blocked" ? "Bloqué" : driverName ? "En service" : "Actif"}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">Conducteur</p>
                      <p className="font-medium">{driverName || "Non assigné"}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">Prochain entretien</p>
                      <p className="font-medium">
                        {v.next_maintenance_at
                          ? format(new Date(v.next_maintenance_at), "d MMM yyyy", { locale: fr })
                          : "Non planifié"}
                      </p>
                    </div>
                    {canAssignDriver && v.status === "ok" && v.active_assignment ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 border-destructive/30 text-destructive hover:text-destructive"
                        disabled={endAssignment.isPending}
                        onClick={() =>
                          handleEndAssignment(v.active_assignment!.id, driverName || undefined)
                        }
                      >
                        <UserMinus className="h-4 w-4" aria-hidden />
                        Delier le chauffeur
                      </Button>
                    ) : canAssignDriver && v.status === "ok" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => openAssignDialog(v.id)}
                      >
                        <UserPlus className="h-4 w-4" aria-hidden />
                        Affecter un chauffeur
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {canWriteFleet && (
        <VehicleFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          fleetId={userFleetId}
          onSuccess={handleSuccess}
        />
      )}

      {canAssignDriver && selectedVehicleId ? (
        <AssignmentFormDialog
          open={assignDialogOpen}
          onOpenChange={(open) => {
            setAssignDialogOpen(open);
            if (!open) setSelectedVehicleId(null);
          }}
          fleetId={userFleetId}
          preselectedVehicleId={selectedVehicleId}
        />
      ) : null}
    </div>
  );
}
