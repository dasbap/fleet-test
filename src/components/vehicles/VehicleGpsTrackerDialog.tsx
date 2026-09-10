import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Save, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  VehicleGpsTrackerService,
  type VehicleGpsTrackerStatus,
} from "@/services/vehicle-gps-tracker.service";

const trackerService = new VehicleGpsTrackerService();

interface VehicleGpsTrackerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  registration: string;
}

export function VehicleGpsTrackerDialog({
  open,
  onOpenChange,
  vehicleId,
  registration,
}: VehicleGpsTrackerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deviceIdentifier, setDeviceIdentifier] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState<VehicleGpsTrackerStatus>("active");

  const trackerQuery = useQuery({
    queryKey: ["vehicle-gps-tracker", vehicleId],
    queryFn: () => trackerService.get(vehicleId),
    enabled: open && Boolean(vehicleId),
  });

  useEffect(() => {
    if (!open) return;
    const tracker = trackerQuery.data;
    if (tracker) {
      setDeviceIdentifier(tracker.device_identifier);
      setProvider(tracker.provider ?? "");
      setStatus(tracker.status);
      return;
    }
    if (!trackerQuery.isLoading) {
      setDeviceIdentifier("");
      setProvider("");
      setStatus("active");
    }
  }, [open, trackerQuery.data, trackerQuery.isLoading]);

  const saveMutation = useMutation({
    mutationFn: () =>
      trackerService.save({
        vehicleId,
        deviceIdentifier,
        provider,
        status,
      }),
    onSuccess: (tracker) => {
      queryClient.setQueryData(["vehicle-gps-tracker", vehicleId], tracker);
      toast({
        title: "Traceur GPS associé",
        description: `${tracker.device_identifier} est associé à ${registration}.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Configuration GPS impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => trackerService.remove(vehicleId),
    onSuccess: () => {
      queryClient.setQueryData(["vehicle-gps-tracker", vehicleId], null);
      toast({
        title: "Traceur GPS retiré",
        description: `${registration} n'est plus associé à ce traceur.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Retrait impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    },
  });

  const normalizedIdentifier = deviceIdentifier.trim().toUpperCase().replace(/\s+/g, "");
  const identifierValid = /^[A-Z0-9:_-]{6,64}$/.test(normalizedIdentifier);
  const busy = saveMutation.isPending || removeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" aria-hidden />
            Traceur GPS · {registration}
          </DialogTitle>
          <DialogDescription>
            Associez le boîtier GPS installé dans ce véhicule. Aucun administrateur n'est requis pour un organisateur de la flotte.
          </DialogDescription>
        </DialogHeader>

        {trackerQuery.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement du traceur…
          </div>
        ) : trackerQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {trackerQuery.error instanceof Error ? trackerQuery.error.message : "Impossible de charger le traceur GPS."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`gps-device-${vehicleId}`}>Identifiant du traceur / IMEI</Label>
              <Input
                id={`gps-device-${vehicleId}`}
                value={deviceIdentifier}
                maxLength={64}
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Ex. 352099001234567"
                onChange={(event) => setDeviceIdentifier(event.target.value)}
                onBlur={() => setDeviceIdentifier(normalizedIdentifier)}
                aria-invalid={deviceIdentifier.length > 0 && !identifierValid}
              />
              <p className="text-xs text-muted-foreground">
                6 à 64 caractères : lettres, chiffres, deux-points, tiret ou underscore.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`gps-provider-${vehicleId}`}>Fournisseur GPS (optionnel)</Label>
              <Input
                id={`gps-provider-${vehicleId}`}
                value={provider}
                maxLength={80}
                placeholder="Ex. Teltonika, Traccar…"
                onChange={(event) => setProvider(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`gps-status-${vehicleId}`}>Statut</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as VehicleGpsTrackerStatus)}>
                <SelectTrigger id={`gps-status-${vehicleId}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertDescription>
                Cette association identifie le boîtier du véhicule. Les positions temps réel apparaîtront quand le fournisseur GPS sera relié à E-Samba.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {trackerQuery.data ? (
            <Button
              type="button"
              variant="destructive"
              disabled={busy || trackerQuery.isLoading}
              onClick={() => removeMutation.mutate()}
            >
              {removeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Retirer
            </Button>
          ) : <span />}
          <Button
            type="button"
            disabled={!identifierValid || busy || trackerQuery.isLoading || trackerQuery.isError}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {trackerQuery.data ? "Enregistrer" : "Associer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
