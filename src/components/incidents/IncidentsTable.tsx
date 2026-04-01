import { useState } from "react";
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
import { MoreHorizontal, Wrench, Eye, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Incident, useCreateMaintenanceFromIncident } from "@/hooks/useIncidents";
import { usePermissions } from "@/hooks/usePermissions";

interface IncidentsTableProps {
  incidents: Incident[];
  isLoading: boolean;
  onRefresh: () => void;
}

const severityConfig = {
  low: { label: "Faible", variant: "secondary" as const },
  medium: { label: "Moyen", variant: "outline" as const },
  high: { label: "Élevé", variant: "default" as const },
  critical: { label: "Critique", variant: "destructive" as const },
};

const IncidentsTable = ({ incidents, isLoading, onRefresh }: IncidentsTableProps) => {
  const createMaintenance = useCreateMaintenanceFromIncident();
  const { canCreateMaintenanceFromIncident } = usePermissions();

  const canCreateMaintenance = canCreateMaintenanceFromIncident;

  const handleCreateMaintenance = async (incident: Incident) => {
    if (!incident.vehicle?.fleet_id) return;
    
    await createMaintenance.mutateAsync({
      incident_id: incident.id,
      vehicle_id: incident.vehicle_id,
      fleet_id: incident.vehicle.fleet_id,
      priority: incident.severity,
    });
    onRefresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement des incidents...</div>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Wrench className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Aucun incident</h3>
        <p className="text-muted-foreground">
          Aucun incident n'a été signalé pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Véhicule</TableHead>
            <TableHead>Chauffeur</TableHead>
            <TableHead>Sévérité</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((incident) => (
            <TableRow key={incident.id}>
              <TableCell>
                <div className="max-w-[250px]">
                  <div className="font-medium truncate">{incident.description}</div>
                  {incident.evidence_path && (
                    <div className="text-xs text-muted-foreground">
                      📎 Preuve jointe
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-mono text-sm">
                  {incident.vehicle?.registration || "N/A"}
                </div>
                {incident.vehicle?.brand && (
                  <div className="text-xs text-muted-foreground">
                    {incident.vehicle.brand} {incident.vehicle.model}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {incident.driver?.full_name || "Inconnu"}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={severityConfig[incident.severity].variant}>
                  {severityConfig[incident.severity].label}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(incident.created_at), "dd MMM yyyy", { locale: fr })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir détails
                    </DropdownMenuItem>
                    {canCreateMaintenance && incident.vehicle?.fleet_id && (
                      <DropdownMenuItem onClick={() => handleCreateMaintenance(incident)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer intervention
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default IncidentsTable;
