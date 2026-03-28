import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, MoreVertical, User, AlertCircle, CheckCircle, UserPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useVehicles, VehicleStatus } from "@/hooks/useVehicles";
import { AssignmentFormDialog } from "./AssignmentFormDialog";
import { useQueryClient } from "@tanstack/react-query";

// Configuration du statut des véhicules
// Règle métier : Un véhicule "Actif" (statut ok) doit être lié à un chauffeur actif
// Le statut dépend à la fois du statut technique (ok/blocked) et de l'assignation
const getVehicleStatusConfig = (
  status: VehicleStatus,
  hasActiveAssignment: boolean
): { label: string; icon: typeof CheckCircle; className: string } => {
  if (status === "blocked") {
    return {
      label: "Bloqué",
      icon: AlertCircle,
      className: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }
  
  // Statut "ok" ET assigné à un chauffeur actif = Actif
  if (hasActiveAssignment) {
    return {
      label: "Actif",
      icon: CheckCircle,
      className: "bg-success/10 text-success border-success/20",
    };
  }
  
  // Statut "ok" mais non assigné = Disponible (mais pas Actif selon la règle métier)
  return {
    label: "Disponible",
    icon: CheckCircle,
    className: "bg-muted/10 text-muted-foreground border-muted/20",
  };
};

interface VehiclesTableProps {
  /** ID de la flotte pour filtrer les véhicules. Si absent, tous les véhicules accessibles sont affichés. */
  fleetId?: string;
}

const VehiclesTable = ({ fleetId }: VehiclesTableProps) => {
  const { data: vehicles = [], isLoading } = useVehicles(fleetId);
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<{ id: string; registration: string } | null>(null);

  const handleAssignClick = (vehicleId: string, registration: string) => {
    if (!fleetId) return;
    setSelectedVehicle({ id: vehicleId, registration });
    setAssignDialogOpen(true);
  };

  const handleAssignSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Liste des véhicules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Liste des véhicules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun véhicule</h3>
            <p className="text-muted-foreground">
              Ajoutez votre premier véhicule pour commencer.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Liste des véhicules</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Véhicule</TableHead>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Kilométrage</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => {
              const status = vehicle.status as VehicleStatus;
              const hasActiveAssignment = !!vehicle.active_assignment;
              const config = getVehicleStatusConfig(status, hasActiveAssignment);
              const StatusIcon = config.icon;
              
              return (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <Link
                      to={`/dashboard/vehicles/${vehicle.id}`}
                      className="flex items-center gap-3 rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {vehicle.brand} {vehicle.model}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.year}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/dashboard/vehicles/${vehicle.id}`}
                      className="font-mono font-semibold text-foreground underline-offset-4 hover:underline"
                    >
                      {vehicle.registration}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{vehicle.current_km.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">km</span>
                  </TableCell>
                  <TableCell>
                    {vehicle.active_assignment?.driver?.full_name ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{vehicle.active_assignment.driver.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("gap-1", config.className)}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                    {vehicle.blocked_reason && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {vehicle.blocked_reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/dashboard/vehicles/${vehicle.id}`}>Voir détails</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleAssignClick(vehicle.id, vehicle.registration)}
                          disabled={!fleetId || vehicle.status === 'blocked' || !!vehicle.active_assignment}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Affecter chauffeur
                        </DropdownMenuItem>
                        <DropdownMenuItem>Historique</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      {/* Assignment Dialog */}
      {fleetId && (
        <AssignmentFormDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          fleetId={fleetId}
          preselectedVehicleId={selectedVehicle?.id}
        />
      )}
    </Card>
  );
};

export default VehiclesTable;
