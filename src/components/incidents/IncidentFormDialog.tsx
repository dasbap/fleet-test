import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useCreateIncident } from "@/hooks/useIncidents";
import { GeolocationCoordinatesCard } from "@/components/geolocation/GeolocationCoordinatesCard";
import type { GeoPositionSnapshot } from "@/types/geolocation";
import {
  incidentReportFormSchema,
  type IncidentReportFormValues,
} from "@/domain/schemas/incident.schema";

interface IncidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  fleetId?: string;
}

const severityLabels: Record<IncidentReportFormValues["severity"], string> = {
  low: "Faible - Peut attendre",
  medium: "Moyen - À traiter rapidement",
  high: "Élevé - Urgent",
  critical: "Critique - Véhicule immobilisé",
};

const IncidentFormDialog = ({
  open,
  onOpenChange,
  onSuccess,
  fleetId,
}: IncidentFormDialogProps) => {
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles(fleetId);
  const createIncident = useCreateIncident();
  const [geoSnapshot, setGeoSnapshot] = useState<GeoPositionSnapshot | null>(null);

  const form = useForm<IncidentReportFormValues>({
    resolver: zodResolver(incidentReportFormSchema),
    defaultValues: {
      vehicle_id: "",
      description: "",
      severity: "medium",
      attachGeo: true,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        vehicle_id: "",
        description: "",
        severity: "medium",
        attachGeo: true,
      });
      setGeoSnapshot(null);
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      vehicle_id: values.vehicle_id,
      description: values.description,
      severity: values.severity,
      ...(values.attachGeo &&
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
    onSuccess();
  });

  const descriptionLength = form.watch("description").trim().length;
  const busy = createIncident.isPending || vehiclesLoading;

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

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <GeolocationCoordinatesCard
              active={open}
              syncOnOpen={open}
              onCoordinatesChange={setGeoSnapshot}
            />

            <FormField
              control={form.control}
              name="attachGeo"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={busy}
                    />
                  </FormControl>
                  <div className="grid gap-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Joindre la position au signalement
                    </FormLabel>
                    <p className="text-muted-foreground text-xs">
                      Recommandé pour confirmer la présence terrain et localiser
                      l’incident. Désactivez si vous préférez ne pas transmettre les
                      coordonnées.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Véhicule *</FormLabel>
                  <Select
                    disabled={busy}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger id="vehicle">
                        <SelectValue placeholder="Sélectionner un véhicule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.registration} - {vehicle.brand} {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sévérité</FormLabel>
                  <Select
                    disabled={busy}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger id="severity">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        ["low", "medium", "high", "critical"] as const
                      ).map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {severityLabels[severity]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="description">Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      id="description"
                      placeholder="Décrivez l'incident en détail (ex: Crevaison pneu avant droit au carrefour Liberté)..."
                      rows={4}
                      disabled={busy}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum 10 caractères ({descriptionLength}/10).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                {createIncident.isPending ? "Envoi..." : "Signaler l'incident"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default IncidentFormDialog;
