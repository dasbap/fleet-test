import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Car, MoreVertical, Phone, Calendar, History, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useFleetDrivers, useActiveAssignments } from "@/hooks/useAssignments";
import { useFleetDriverActivationHealth } from "@/hooks/useFleetDriverActivationHealth";
import { useFleetOpenShifts } from "@/hooks/useFleetCompliance";
import { PlannedShiftPlannerModal } from "@/components/operations/PlannedShiftPlannerModal";
import { cn } from "@/lib/utils";
import DriverHistoryDialog from "@/components/drivers/DriverHistoryDialog";
import DriverProfileDialog from "@/components/drivers/DriverProfileDialog";
import { ContextualHelpTrigger } from "@/components/help/ContextualHelpTrigger";

// Réparation : Ajout des fonctions utilitaires manquantes pour le score
function getScoreBadgeVariant(scoreLevel: string): BadgeProps["variant"] {
  switch (scoreLevel) {
    case "excellent":
      return "default";
    case "bon":
      return "secondary";
    case "correct":
      return "outline";
    case "faible":
      return "destructive";
    default:
      return "secondary";
  }
}

function getScoreLabel(scoreLevel: string): string {
  switch (scoreLevel) {
    case "excellent":
      return "Excellent";
    case "bon":
      return "Bon";
    case "correct":
      return "Correct";
    case "faible":
      return "Faible";
    default:
      return "Inconnu";
  }
}

type DriverFieldStatus = "on_mission" | "assigned" | "available";

const DRIVER_STATUS_LABEL: Record<DriverFieldStatus, string> = {
  on_mission: "En mission",
  assigned: "Affecté",
  available: "Disponible",
};

function resolveDriverFieldStatus(
  driverUserId: string,
  hasAssignment: boolean,
  openShiftDriverIds: Set<string>,
): DriverFieldStatus {
  if (openShiftDriverIds.has(driverUserId)) return "on_mission";
  if (hasAssignment) return "assigned";
  return "available";
}

const Drivers = () => {
  const navigate = useNavigate();
  const { role, userFleetId } = useAuth();
  const { can } = useRoleAccess();
  const canManageAssignment = can("assignment.manage");

  const { data: drivers = [], isLoading: driversLoading } = useFleetDrivers(
    userFleetId ?? undefined
  );
  const { data: assignments = [], isLoading: assignmentsLoading } = useActiveAssignments(
    userFleetId ?? undefined
  );

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedDriverName, setSelectedDriverName] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState<{ driverId: string; vehicleId?: string } | null>(
    null,
  );
  const [activationFilter, setActivationFilter] = useState<
    "all" | "no_phone" | "never_shift"
  >("all");

  const { data: activationHealth } = useFleetDriverActivationHealth(userFleetId ?? undefined);
  const { data: openShifts = [] } = useFleetOpenShifts(userFleetId ?? undefined);

  const openShiftDriverIds = useMemo(
    () =>
      new Set(
        openShifts
          .map((s) => s.assignment?.driver_user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    [openShifts],
  );

  useEffect(() => {
    if (!userFleetId && role === null) {
      navigate("/dashboard/create-fleet");
    }
  }, [userFleetId, role, navigate]);

  const isLoading = driversLoading || assignmentsLoading;

  const flagsByUser = new Map<
    string,
    { has_phone: boolean; has_ever_shift: boolean }
  >();
  activationHealth?.drivers.forEach((d) => {
    flagsByUser.set(d.user_id, {
      has_phone: d.has_phone,
      has_ever_shift: d.has_ever_shift,
    });
  });

  // Associer les assignments aux drivers
  const driversWithAssignments = drivers
    .map((driver) => {
      const assignment = assignments.find((a) => a.driver_user_id === driver.user_id);
      const flags = flagsByUser.get(driver.user_id);
      return {
        ...driver,
        currentAssignment: assignment || null,
        terrainFlags: flags ?? null,
      };
    })
    .filter((driver) => {
      if (activationFilter === "all") return true;
      const f = driver.terrainFlags;
      if (!f) return true;
      if (activationFilter === "no_phone") return !f.has_phone;
      return !f.has_ever_shift;
    });

  const handleViewHistory = (driverId: string) => {
    setSelectedDriverId(driverId);
    setHistoryOpen(true);
  };

  const handleViewProfile = (driverId: string, name?: string | null) => {
    setSelectedDriverId(driverId);
    setSelectedDriverName(name ?? null);
    setProfileOpen(true);
  };

  if (!userFleetId) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <User className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Aucune flotte trouvée
            </h3>
            <p className="text-muted-foreground mb-4">
              Vous devez être membre d&apos;une flotte pour voir les chauffeurs. Rejoignez-en une via un code d&apos;invitation (lors de l&apos;inscription).
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

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">
              Gestion des chauffeurs
            </h1>
            <p className="text-muted-foreground mt-1">
              Suivez les affectations et l&apos;historique de vos chauffeurs
            </p>
            <ContextualHelpTrigger slug="assign-driver" className="mt-2" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{drivers.length}</p>
                  <p className="text-sm text-muted-foreground">
                    Chauffeurs actifs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <Car className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openShiftDriverIds.size}</p>
                  <p className="text-sm text-muted-foreground">En mission</p>
                  <p className="text-xs text-muted-foreground">
                    {
                      driversWithAssignments.filter(
                        (d) => d.currentAssignment && !openShiftDriverIds.has(d.user_id),
                      ).length
                    }{" "}
                    affecté(s) sans créneau ouvert
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {
                      driversWithAssignments.filter(
                        (d) => !d.currentAssignment
                      ).length
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {activationHealth?.with_phone_count ?? "—"}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {activationHealth?.total_drivers ?? "—"}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">Tél. renseignés</p>
                  <p className="text-xs text-muted-foreground">
                    {activationHealth != null
                      ? `${activationHealth.pct_with_phone} %`
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {activationHealth?.never_shifted_count ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Jamais de créneau
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground mr-2">Filtrer :</span>
          {(
            [
              ["all", "Tous"],
              ["no_phone", "Sans téléphone"],
              ["never_shift", "Sans créneau"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={activationFilter === key ? "default" : "outline"}
              onClick={() => setActivationFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Drivers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">
              Liste des chauffeurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : drivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Aucun chauffeur</h3>
                <p className="text-muted-foreground">
                  Ajoutez des chauffeurs à votre flotte pour commencer.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Activation terrain</TableHead>
                    <TableHead>Véhicule actuel</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driversWithAssignments.map((driver) => (
                    <TableRow key={driver.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {driver.full_name || "Sans nom"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {driver.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{driver.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Non renseigné
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {driver.terrainFlags && !driver.terrainFlags.has_phone && (
                            <Badge variant="destructive" className="text-[10px]">
                              Sans tel.
                            </Badge>
                          )}
                          {driver.terrainFlags && !driver.terrainFlags.has_ever_shift && (
                            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-800 dark:text-amber-200">
                              Jamais créneau
                            </Badge>
                          )}
                          {driver.terrainFlags &&
                            driver.terrainFlags.has_phone &&
                            driver.terrainFlags.has_ever_shift && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          {!driver.terrainFlags && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {driver.currentAssignment?.vehicle ? (
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono">
                              {driver.currentAssignment.vehicle.registration}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {driver.currentAssignment.vehicle.brand}{" "}
                              {driver.currentAssignment.vehicle.model}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Non affecté
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {driver.score ? (
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={getScoreBadgeVariant(driver.score.score_level)}
                              className="w-fit"
                            >
                              {getScoreLabel(driver.score.score_level)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Number(driver.score.financial_score).toFixed(1)}/100
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">
                            Non calculé
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const status = resolveDriverFieldStatus(
                            driver.user_id,
                            Boolean(driver.currentAssignment),
                            openShiftDriverIds,
                          );
                          return (
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1",
                                status === "on_mission" &&
                                  "bg-success/10 text-success border-success/20",
                                status === "assigned" &&
                                  "bg-primary/10 text-primary border-primary/20",
                                status === "available" && "bg-muted text-muted-foreground",
                              )}
                            >
                              {DRIVER_STATUS_LABEL[status]}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleViewProfile(driver.user_id, driver.full_name)
                              }
                            >
                              <User className="w-4 h-4 mr-2" />
                              Voir fiche
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewHistory(driver.user_id)}
                            >
                              <History className="w-4 h-4 mr-2" />
                              Voir historique
                            </DropdownMenuItem>
                            {canManageAssignment && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setPlanTarget({
                                    driverId: driver.user_id,
                                    vehicleId: driver.currentAssignment?.vehicle_id,
                                  });
                                }}
                              >
                                <Calendar className="w-4 h-4 mr-2" />
                                Planifier
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <DriverHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        driverId={selectedDriverId}
      />
      <DriverProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        fleetId={userFleetId ?? undefined}
        driverId={selectedDriverId}
        driverName={selectedDriverName}
      />
      {userFleetId && planTarget ? (
        <PlannedShiftPlannerModal
          fleetId={userFleetId}
          defaultDriverUserId={planTarget.driverId}
          defaultVehicleId={planTarget.vehicleId}
          open
          hideTrigger
          onOpenChange={(open) => {
            if (!open) setPlanTarget(null);
          }}
        />
      ) : null}
    </>
  );
};

export default Drivers;
