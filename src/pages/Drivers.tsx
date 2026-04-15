import { useState, useEffect } from "react";
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
import { User, Car, MoreVertical, Phone, Calendar, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFleetDrivers, useActiveAssignments } from "@/hooks/useAssignments";
import { cn } from "@/lib/utils";
import DriverHistoryDialog from "@/components/drivers/DriverHistoryDialog";
import DriverProfileDialog from "@/components/drivers/DriverProfileDialog";

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

const Drivers = () => {
  const navigate = useNavigate();
  const { role, userFleetId } = useAuth();

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

  useEffect(() => {
    if (!userFleetId && role === null) {
      navigate("/dashboard/create-fleet");
    }
  }, [userFleetId, role, navigate]);

  const isLoading = driversLoading || assignmentsLoading;

  // Associer les assignments aux drivers
  const driversWithAssignments = drivers.map((driver) => {
    const assignment = assignments.find((a) => a.driver_user_id === driver.user_id);
    return {
      ...driver,
      currentAssignment: assignment || null,
    };
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
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <p className="text-2xl font-bold">
                    {
                      driversWithAssignments.filter((d) => d.currentAssignment)
                        .length
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">En mission</p>
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
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1",
                            driver.currentAssignment
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {driver.currentAssignment ? "En mission" : "Disponible"}
                        </Badge>
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
                            <DropdownMenuItem>
                              <Calendar className="w-4 h-4 mr-2" />
                              Planifier
                            </DropdownMenuItem>
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
    </>
  );
};

export default Drivers;
