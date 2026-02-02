import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Incident } from "@/hooks/useIncidents";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface IncidentValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
  onSuccess: () => void;
}

const severityConfig = {
  low: { label: "Faible", variant: "secondary" as const },
  medium: { label: "Moyen", variant: "outline" as const },
  high: { label: "Élevé", variant: "default" as const },
  critical: { label: "Critique", variant: "destructive" as const },
};

const IncidentValidationDialog = ({
  open,
  onOpenChange,
  incident,
  onSuccess,
}: IncidentValidationDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationNotes, setValidationNotes] = useState("");
  const [action, setAction] = useState<"validate" | "reject" | null>(null);

  const handleSubmit = async (actionType: "validate" | "reject") => {
    setAction(actionType);
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: actionType === "validate" ? "Incident validé" : "Incident rejeté",
        description:
          actionType === "validate"
            ? "L'incident a été validé et transmis à la maintenance"
            : "L'incident a été rejeté",
      });
      setValidationNotes("");
      setAction(null);
      onSuccess();
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Validation de l'incident
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Incident details */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">{incident.title}</h3>
              <Badge variant={severityConfig[incident.severity].variant}>
                {severityConfig[incident.severity].label}
              </Badge>
            </div>

            {incident.description && (
              <p className="text-sm text-muted-foreground">
                {incident.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Véhicule: </span>
                <span className="font-mono">
                  {incident.vehicle?.plate_number || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span>
                  {format(new Date(incident.reported_at), "dd MMM yyyy HH:mm", {
                    locale: fr,
                  })}
                </span>
              </div>
            </div>

            {incident.location && (
              <div className="text-sm">
                <span className="text-muted-foreground">Localisation: </span>
                <span>{incident.location}</span>
              </div>
            )}
          </div>

          {/* Validation notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes de validation</Label>
            <Textarea
              id="notes"
              placeholder="Ajoutez des observations ou instructions..."
              rows={3}
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={() => handleSubmit("reject")}
              disabled={isSubmitting}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isSubmitting && action === "reject" ? "..." : "Rejeter"}
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => handleSubmit("validate")}
              disabled={isSubmitting}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isSubmitting && action === "validate" ? "..." : "Valider"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncidentValidationDialog;
