import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuth } from "@/hooks/useAuth";
import { useDeclareIncident } from "@/hooks/useIncidents";
import { GeolocationCoordinatesCard } from "@/components/geolocation/GeolocationCoordinatesCard";
import type { GeoPositionSnapshot } from "@/types/geolocation";
import {
  incidentDeclarationSchema,
  type IncidentDeclarationFormValues,
} from "@/features/incidents/declare/incidentDeclarationSchema";
import { IncidentCategorySelect } from "@/features/incidents/components/IncidentCategorySelect";
import { IncidentPhotoCapture } from "@/features/incidents/components/IncidentPhotoCapture";

interface IncidentDeclarationFormProps {
  fleetId: string;
  /** Préremplissage (ex. query `vehicleId` ou véhicule unique conducteur). */
  defaultVehicleId?: string;
  disabled?: boolean;
  className?: string;
  /** Après envoi réussi (brouillon hors ligne ou API). */
  onComplete?: () => void;
}

const severityLabels: Record<string, string> = {
  low: "Faible — peut attendre",
  medium: "Moyen — à traiter rapidement",
  high: "Élevé — urgent",
  critical: "Critique — immobilisation",
};

/**
 * Formulaire complet « Déclarer un incident » : véhicule, type, description, photo, GPS, envoi.
 */
export function IncidentDeclarationForm({
  fleetId,
  defaultVehicleId,
  disabled,
  className,
  onComplete,
}: IncidentDeclarationFormProps) {
  const { user } = useAuth();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles(fleetId);
  const declare = useDeclareIncident();
  const [geoSnapshot, setGeoSnapshot] = useState<GeoPositionSnapshot | null>(null);

  const suggestedVehicleId = useMemo(() => {
    if (defaultVehicleId) return defaultVehicleId;
    if (!user?.id) return "";
    const mine = vehicles.filter((v) => v.active_assignment?.driver_user_id === user.id);
    if (mine.length === 1) return mine[0].id;
    return "";
  }, [defaultVehicleId, user?.id, vehicles]);

  const form = useForm<IncidentDeclarationFormValues>({
    resolver: zodResolver(incidentDeclarationSchema),
    defaultValues: {
      vehicle_id: "",
      incident_category: "other",
      severity: "medium",
      description: "",
      attachGeo: true,
      evidenceDataUrl: null,
    },
  });

  useEffect(() => {
    if (suggestedVehicleId) {
      form.setValue("vehicle_id", suggestedVehicleId);
    }
  }, [suggestedVehicleId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (values.attachGeo) {
      const p = geoSnapshot;
      if (!p || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) {
        toast({
          title: "Position manquante",
          description:
            "Capturez la position ou décochez « Joindre la position » pour envoyer sans GPS.",
          variant: "destructive",
        });
        return;
      }
    }

    await declare.mutateAsync({
      vehicle_id: values.vehicle_id,
      description: values.description,
      severity: values.severity,
      incident_category: values.incident_category,
      attachGeo: values.attachGeo,
      latitude: values.attachGeo && geoSnapshot ? geoSnapshot.latitude : null,
      longitude: values.attachGeo && geoSnapshot ? geoSnapshot.longitude : null,
      evidenceDataUrl: values.evidenceDataUrl ?? null,
    });

    form.reset({
      vehicle_id: suggestedVehicleId || "",
      incident_category: "other",
      severity: "medium",
      description: "",
      attachGeo: true,
      evidenceDataUrl: null,
    });
    setGeoSnapshot(null);
    onComplete?.();
  });

  const noVehicles = !vehiclesLoading && vehicles.length === 0;
  const busy = disabled || declare.isPending || vehiclesLoading || noVehicles;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className={`space-y-6 ${className ?? ""}`}>
        {noVehicles ? (
          <Alert variant="destructive">
            <AlertTitle>Aucun véhicule</AlertTitle>
            <AlertDescription>
              Ajoutez un véhicule à la flotte pour pouvoir envoyer un signalement.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center gap-2 text-primary">
          <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Signalement sécurisé. Les champs marqués d’un astérisque sont obligatoires.
          </p>
        </div>

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
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un véhicule" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration}
                      {v.brand || v.model ? ` — ${[v.brand, v.model].filter(Boolean).join(" ")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <IncidentCategorySelect control={form.control} disabled={busy} />

        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gravité</FormLabel>
              <Select
                disabled={busy}
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(["low", "medium", "high", "critical"] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {severityLabels[s]}
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
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={5}
                  disabled={busy}
                  placeholder="Ex. crevaison pneu avant droit, carrefour Liberté…"
                  className="resize-none"
                />
              </FormControl>
              <FormDescription>Minimum 10 caractères.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Controller
          control={form.control}
          name="evidenceDataUrl"
          render={({ field }) => (
            <IncidentPhotoCapture
              value={field.value}
              onChange={field.onChange}
              disabled={busy}
            />
          )}
        />

        <GeolocationCoordinatesCard
          active
          syncOnOpen
          onCoordinatesChange={setGeoSnapshot}
          className="border-border/80"
        />

        <FormField
          control={form.control}
          name="attachGeo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  disabled={busy}
                  aria-label="Joindre la position au signalement"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="!mt-0">Joindre la position au signalement</FormLabel>
                <p className="text-muted-foreground text-xs">
                  Recommandé sur le terrain. Décochez si vous ne souhaitez pas transmettre le GPS.
                </p>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full gap-2" size="lg" disabled={busy}>
          {declare.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Envoi…
            </>
          ) : (
            "Enregistrer le signalement"
          )}
        </Button>
      </form>
    </Form>
  );
}
