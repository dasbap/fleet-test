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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useCreateIncident, IncidentSeverity } from "@/hooks/useIncidents";

interface IncidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const IncidentFormDialog = ({ open, onOpenChange, onSuccess }: IncidentFormDialogProps) => {
  const { data: vehicles = [] } = useVehicles();
  const createIncident = useCreateIncident();
  
  const [formData, setFormData] = useState({
    vehicle_id: "",
    description: "",
    severity: "medium" as IncidentSeverity,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicle_id || !formData.description) {
      return;
    }

    await createIncident.mutateAsync({
      vehicle_id: formData.vehicle_id,
      description: formData.description,
      severity: formData.severity,
    });

    setFormData({
      vehicle_id: "",
      description: "",
      severity: "medium",
    });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Signaler un incident
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Véhicule *</Label>
            <Select
              value={formData.vehicle_id}
              onValueChange={(value) =>
                setFormData({ ...formData, vehicle_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration} - {vehicle.brand} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Sévérité</Label>
            <Select
              value={formData.severity}
              onValueChange={(value) =>
                setFormData({ ...formData, severity: value as IncidentSeverity })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Faible - Peut attendre</SelectItem>
                <SelectItem value="medium">Moyen - À traiter rapidement</SelectItem>
                <SelectItem value="high">Élevé - Urgent</SelectItem>
                <SelectItem value="critical">Critique - Véhicule immobilisé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Décrivez l'incident en détail (ex: Crevaison pneu avant droit au carrefour Liberté)..."
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={createIncident.isPending || !formData.vehicle_id || !formData.description}
            >
              {createIncident.isPending ? "Envoi..." : "Signaler l'incident"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IncidentFormDialog;
