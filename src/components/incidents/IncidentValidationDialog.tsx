import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wrench, Car } from "lucide-react";
import { Incident, useCreateMaintenanceFromIncident } from "@/hooks/useIncidents";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SignedStorageLink } from "@/components/storage/SignedStorageLink";

interface IncidentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  onSuccess: () => void;
  canCreateMaintenance?: boolean;
}

const severityConfig = {
  low: { label: "Faible", variant: "secondary" as const },
  medium: { label: "Moyen", variant: "outline" as const },
  high: { label: "Élevé", variant: "default" as const },
  critical: { label: "Critique", variant: "destructive" as const },
};

const statusLabels: Record<Incident["status"], string> = {
  open: "Ouvert",
  investigating: "En cours",
  resolved: "Résolu",
  closed: "Clôturé",
};

const IncidentDetailsDialog = ({
  open,
  onOpenChange,
  incident,
  onSuccess,
  canCreateMaintenance = false,
}: IncidentDetailsDialogProps) => {
  const createMaintenance = useCreateMaintenanceFromIncident();
  const [notes, setNotes] = useState("");

  const handleCreateMaintenance = async () => {
    if (!incident.vehicle?.fleet_id) return;
    
    await createMaintenance.mutateAsync({
      incident_id: incident.id,
      vehicle_id: incident.vehicle_id,
      fleet_id: incident.vehicle.fleet_id,
      priority: incident.severity,
    });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Détails de l'incident
          </DialogTitle>
          <DialogDescription>
            Consultez le signalement et créez une intervention si nécessaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Incident details */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm">
                  {incident.vehicle?.registration || "N/A"}
                </span>
              </div>
              <Badge variant={severityConfig[incident.severity].variant}>
                {severityConfig[incident.severity].label}
              </Badge>
            </div>

            <div>
              <p className="text-sm">{incident.description}</p>
            </div>

            <div className="flex items-center gap-4 text-sm pt-2 border-t flex-wrap">
              <div>
                <span className="text-muted-foreground">Signalé par: </span>
                <span>{incident.driver?.full_name || "Inconnu"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Le: </span>
                <span>
                  {format(new Date(incident.created_at), "dd MMM yyyy HH:mm", {
                    locale: fr,
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Statut: </span>
                <span>{statusLabels[incident.status]}</span>
              </div>
            </div>

            {incident.latitude != null && incident.longitude != null && (
              <div className="text-sm font-mono">
                <span className="text-muted-foreground">Position: </span>
                {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
              </div>
            )}

            {incident.evidence_path && (
              <div className="text-sm">
                <span className="text-muted-foreground">Preuve: </span>
                <SignedStorageLink
                  bucket="incident-evidence"
                  pathOrUrl={incident.evidence_path}
                />
              </div>
            )}
          </div>

          {/* Notes section */}
          {canCreateMaintenance && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Ajoutez des observations..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
            {canCreateMaintenance && incident.vehicle?.fleet_id && (
              <Button
                type="button"
                className="flex-1"
                onClick={handleCreateMaintenance}
                disabled={createMaintenance.isPending}
              >
                <Wrench className="w-4 h-4 mr-2" />
                {createMaintenance.isPending ? "Création..." : "Créer intervention"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncidentDetailsDialog;
