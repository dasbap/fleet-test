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
import { MoreHorizontal, CheckCircle, XCircle, Wrench, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Incident } from "@/hooks/useIncidents";
import IncidentValidationDialog from "./IncidentValidationDialog";
import { AppRole } from "@/hooks/useAuth";

interface IncidentsTableProps {
  incidents: Incident[];
  isLoading: boolean;
  userRole: AppRole;
  onRefresh: () => void;
}

const statusConfig = {
  reported: { label: "Signalé", variant: "secondary" as const },
  validated: { label: "Validé", variant: "default" as const },
  in_progress: { label: "En cours", variant: "outline" as const },
  resolved: { label: "Résolu", variant: "default" as const },
  rejected: { label: "Rejeté", variant: "destructive" as const },
};

const severityConfig = {
  low: { label: "Faible", variant: "secondary" as const },
  medium: { label: "Moyen", variant: "outline" as const },
  high: { label: "Élevé", variant: "default" as const },
  critical: { label: "Critique", variant: "destructive" as const },
};

const IncidentsTable = ({ incidents, isLoading, userRole, onRefresh }: IncidentsTableProps) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isValidationOpen, setIsValidationOpen] = useState(false);

  const canValidate = userRole === "mechanic" || userRole === "organizer" || userRole === "manager";

  const handleValidate = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsValidationOpen(true);
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
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Sévérité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{incident.title}</div>
                    {incident.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {incident.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm">
                    {incident.vehicle?.plate_number || "N/A"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={severityConfig[incident.severity].variant}>
                    {severityConfig[incident.severity].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusConfig[incident.status].variant}>
                    {statusConfig[incident.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(incident.reported_at), "dd MMM yyyy", { locale: fr })}
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
                      {canValidate && incident.status === "reported" && (
                        <>
                          <DropdownMenuItem onClick={() => handleValidate(incident)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Valider
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleValidate(incident)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeter
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedIncident && (
        <IncidentValidationDialog
          open={isValidationOpen}
          onOpenChange={setIsValidationOpen}
          incident={selectedIncident}
          onSuccess={() => {
            setIsValidationOpen(false);
            setSelectedIncident(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
};

export default IncidentsTable;
