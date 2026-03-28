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
import { Checkbox } from "@/components/ui/checkbox";
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
import { GeolocationCoordinatesCard } from "@/components/geolocation/GeolocationCoordinatesCard";
import type { GeoPositionSnapshot } from "@/types/geolocation";

interface IncidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  fleetId?: string;
}

const IncidentFormDialog = ({
  open,
  onOpenChange,
  onSuccess,
  fleetId,
}: IncidentFormDialogProps) => {
  const { data: vehicles = [] } = useVehicles(fleetId);
  const createIncident = useCreateIncident();

  const [formData, setFormData] = useState({
    vehicle_id: "",
    description: "",
    severity: "medium" as IncidentSeverity,
  });
  const [geoSnapshot, setGeoSnapshot] = useState<GeoPositionSnapshot | null>(
    null
  );
  const [attachGeoToIncident, setAttachGeoToIncident] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicle_id || !formData.description) {
      return;
    }

    const payload = {
      vehicle_id: formData.vehicle_id,
      description: formData.description,
      severity: formData.severity,
      ...(attachGeoToIncident &&
      geoSnapshot != null &&
      Number.isFinite(geoSnapshot.latitude) &&
      Number.isFinite(geoSnapshot.longitude)
        ? {
            latitude: geoSnapshot.latitude,
            longitude: geoSnapshot.longitude,
          }
        : {}),
    };

    await createIncident.mutateAsync(payload);

    setFormData({
      vehicle_id: "",
      description: "",
      severity: "medium",
    });
    setGeoSnapshot(null);
    setAttachGeoToIncident(true);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Signaler un incident
          </DialogTitle>
          <DialogDescription>
            Décrivez la situation ; la position peut être jointe pour le terrain
            (GPS).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <GeolocationCoordinatesCard
            active={open}
            syncOnOpen={open}
            onCoordinatesChange={setGeoSnapshot}
          />

          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
            <Checkbox
              id="attach-geo"
              checked={attachGeoToIncident}
              onCheckedChange={(v) => setAttachGeoToIncident(v === true)}
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor="attach-geo" className="text-sm font-medium">
                Joindre la position au signalement
              </Label>
              <p className="text-muted-foreground text-xs">
                Recommandé pour confirmer la présence terrain et localiser
                l’incident. Désactivez si vous préférez ne pas transmettre les
                coordonnées.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle">Véhicule *</Label>
            <Select
              value={formData.vehicle_id}
              onValueChange={(value) =>
                setFormData({ ...formData, vehicle_id: value })
              }
            >
              <SelectTrigger id="vehicle">
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
              <SelectTrigger id="severity">
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
              disabled={
                createIncident.isPending ||
                !formData.vehicle_id ||
                !formData.description
              }
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
