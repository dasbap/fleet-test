import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, Save, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useVehicleDetail } from "@/hooks/useVehicles";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import {
  VehicleGpsTrackerService,
  type VehicleGpsTrackerStatus,
} from "@/services/vehicle-gps-tracker.service";

const trackerService = new VehicleGpsTrackerService();

export default function VehicleGpsTrackerPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { isAtLeast } = useRoleAccess();
  const canManageGps = isAtLeast("organizer");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: vehicle, isLoading: vehicleLoading } = useVehicleDetail(vehicleId);
  const [deviceIdentifier, setDeviceIdentifier] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState<VehicleGpsTrackerStatus>("active");

  const trackerQuery = useQuery({
    queryKey: ["vehicle-gps-tracker", vehicleId],
    queryFn: () => trackerService.get(vehicleId!),
    enabled: Boolean(vehicleId && canManageGps),
  });

  useEffect(() => {
    const tracker = trackerQuery.data;
    if (!tracker) return;
    setDeviceIdentifier(tracker.device_identifier);
    setProvider(tracker.provider ?? "");
    setStatus(tracker.status);
  }, [trackerQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      trackerService.save({
        vehicleId: vehicleId!,
        deviceIdentifier,
        provider,
        status,
      }),
    onSuccess: (tracker) => {
      queryClient.setQueryData(["vehicle-gps-tracker", vehicleId], tracker);
      toast({
        title: "Traceur GPS associé",
        description: `${tracker.device_identifier} est maintenant associé à ce véhicule.`,
      });
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
    mutationFn: () => trackerService.remove(vehicleId!),
    onSuccess: () => {
      queryClient.setQueryData(["vehicle-gps-tracker", vehicleId], null);
      setDeviceIdentifier("");
      setProvider("");
      setStatus("active");
      toast({ title: "Traceur GPS retiré", description: "Le véhicule n'est plus associé à ce traceur." });
    },
    onError: (error) => {
      toast({
        title: "Retrait impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    },
  });

  if (!canManageGps) return <Navigate to={ROUTE_PATHS.dashboardVehicles} replace />;
  if (!vehicleId) return <Navigate to={ROUTE_PATHS.dashboardVehicles} replace />;

  const isBusy = vehicleLoading || trackerQuery.isLoading;
  const normalizedIdentifier = deviceIdentifier.trim().toUpperCase().replace(/\s+/g, "");
  const identifierValid = /^[A-Z0-9:_-]{6,64}$/.test(normalizedIdentifier);

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={vehicle ? ROUTE_PATHS.dashboardVehicleDetail(vehicle.id) : ROUTE_PATHS.dashboardVehicles} aria-label="Retour au véhicule">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Traceur GPS</h1>
          <p className="text-sm text-muted-foreground">
            {vehicle ? `${vehicle.registration} · ${[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}` : "Configuration du véhicule"}
          </p>
        </div>
      </div>

      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          L'organisateur peut associer le boîtier installé dans le véhicule sans intervention d'un administrateur. Cette étape enregistre l'identité du traceur ; la remontée de positions nécessite ensuite l'intégration du fournisseur GPS.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Association du boîtier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isBusy ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          ) : trackerQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{trackerQuery.error instanceof Error ? trackerQuery.error.message : "Impossible de charger le traceur."}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="gps-device-identifier">Identifiant du traceur / IMEI</Label>
                <Input
                  id="gps-device-identifier"
                  value={deviceIdentifier}
                  maxLength={64}
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="Ex. 352099001234567"
                  onChange={(event) => setDeviceIdentifier(event.target.value)}
                  onBlur={() => setDeviceIdentifier(normalizedIdentifier)}
                  aria-invalid={deviceIdentifier.length > 0 && !identifierValid}
                />
                <p className="text-xs text-muted-foreground">6 à 64 caractères : lettres, chiffres, deux-points, tiret ou underscore.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gps-provider">Fournisseur GPS (optionnel)</Label>
                <Input
                  id="gps-provider"
                  value={provider}
                  maxLength={80}
                  placeholder="Ex. Teltonika, Traccar…"
                  onChange={(event) => setProvider(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gps-status">Statut</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as VehicleGpsTrackerStatus)}>
                  <SelectTrigger id="gps-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                {trackerQuery.data ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={removeMutation.isPending || saveMutation.isPending}
                    onClick={() => removeMutation.mutate()}
                  >
                    {removeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Retirer le traceur
                  </Button>
                ) : <span />}
                <Button
                  type="button"
                  disabled={!identifierValid || saveMutation.isPending || removeMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {trackerQuery.data ? "Enregistrer" : "Associer le traceur"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
