import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vehicleCreateFormSchema,
  type VehicleCreateFormValues,
} from "@/domain/schemas/vehicle.schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateVehicle } from "@/hooks/useVehicles";
import { useActivation } from "@/hooks/useActivation";
import { useFleetSubscriptions } from "@/hooks/useSubscriptionManagement";
import { toast } from "@/hooks/use-toast";
import type { SubscriptionSummary } from "@/services/subscription-management.service";
import { legalComplianceService } from "@/services/legal-compliance.service";
import { FleetRepository } from "@/repositories/fleet.repository";
import { VehicleRepository } from "@/repositories/vehicle.repository";
import {
  getVehicleRegistrationRule,
  normalizeVehicleRegistration,
  sanitizeVehicleRegistrationInput,
  validateVehicleRegistrationForCountry,
} from "@/domain/vehicleRegistration";

const vehicleFormSchema = vehicleCreateFormSchema;
const fleetRepository = new FleetRepository();
const vehicleRepository = new VehicleRepository();
type VehicleFormValues = VehicleCreateFormValues;

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleetId: string;
  onSuccess?: () => void;
}

function availableSlotsForCreation(subscription: SubscriptionSummary): number {
  if (subscription.status === "inactive") {
    if (subscription.vehicleCapacity === null) return Number.MAX_SAFE_INTEGER;
    return Math.max(0, subscription.vehicleCapacity - subscription.vehicleCount);
  }
  return subscription.availableSlots;
}

const VehicleFormDialog = ({ open, onOpenChange, fleetId, onSuccess }: VehicleFormDialogProps) => {
  const createVehicle = useCreateVehicle();
  const [registrationCertificateFile, setRegistrationCertificateFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [technicalInspectionFile, setTechnicalInspectionFile] = useState<File | null>(null);
  const { data: countryCode = "CM" } = useQuery({
    queryKey: ["fleet-country", fleetId],
    queryFn: () => fleetRepository.findCountryCodeById(fleetId),
    enabled: Boolean(fleetId),
    staleTime: 5 * 60_000,
  });
  const registrationRule = getVehicleRegistrationRule(countryCode);
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useFleetSubscriptions(fleetId);
  const { completeStep } = useActivation();
  const subscriptionOptions = useMemo(
    () =>
      subscriptions.filter((subscription) => {
        const usableStatus =
          subscription.status === "active" ||
          subscription.status === "trial" ||
          subscription.status === "inactive";
        return usableStatus && availableSlotsForCreation(subscription) > 0;
      }),
    [subscriptions],
  );

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      registration: "",
      subscription_id: "",
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      current_km: 0,
      registration_certificate_number: "",
      insurer_name: "",
      insurance_policy_number: "",
      insurance_issued_at: "",
      insurance_expires_at: "",
      technical_inspection_number: "",
      technical_inspection_issued_at: "",
      technical_inspection_expires_at: "",
      road_tax_reference: "",
      road_tax_expires_at: "",
      transport_license_number: "",
      transport_license_expires_at: "",
    },
  });

  const resetLegalFiles = () => {
    setRegistrationCertificateFile(null);
    setInsuranceFile(null);
    setTechnicalInspectionFile(null);
  };

  const closeDialog = () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onOpenChange(false);
  };

  const onSubmit = async (data: VehicleFormValues) => {
    const normalizedRegistration = normalizeVehicleRegistration(data.registration);
    const registrationError = validateVehicleRegistrationForCountry(normalizedRegistration, countryCode);
    if (registrationError) {
      form.setError("registration", { type: "manual", message: registrationError });
      return;
    }
    if (!registrationCertificateFile || !insuranceFile || !technicalInspectionFile) {
      toast({
        title: "Documents obligatoires manquants",
        description: "Ajoutez la carte grise, l'assurance et la visite technique du véhicule.",
        variant: "destructive",
      });
      return;
    }

    let createdVehicle: Awaited<ReturnType<typeof vehicleRepository.create>> | null = null;
    try {
      createdVehicle = await createVehicle.mutateAsync({
        fleet_id: fleetId,
        subscription_id: data.subscription_id,
        registration: normalizedRegistration,
        brand: data.brand,
        model: data.model,
        year: data.year,
        current_km: data.current_km,
      });
    } catch {
      return;
    }

    try {
      await legalComplianceService.saveVehicleDocuments({
        fleetId,
        vehicleId: createdVehicle.id,
        input: {
          country_code: countryCode,
          registration_certificate_number: data.registration_certificate_number,
          insurer_name: data.insurer_name,
          insurance_policy_number: data.insurance_policy_number,
          insurance_issued_at: data.insurance_issued_at,
          insurance_expires_at: data.insurance_expires_at,
          technical_inspection_number: data.technical_inspection_number,
          technical_inspection_issued_at: data.technical_inspection_issued_at,
          technical_inspection_expires_at: data.technical_inspection_expires_at,
          road_tax_reference: data.road_tax_reference,
          road_tax_expires_at: data.road_tax_expires_at,
          transport_license_number: data.transport_license_number,
          transport_license_expires_at: data.transport_license_expires_at,
        },
        registrationCertificateFile,
        insuranceFile,
        technicalInspectionFile,
      });
    } catch (error) {
      await vehicleRepository.delete(createdVehicle.id).catch(() => undefined);
      toast({
        title: "Création annulée",
        description: error instanceof Error ? error.message : "Impossible d'enregistrer les documents légaux.",
        variant: "destructive",
      });
      return;
    }

    try {
      await completeStep("first_vehicle");
    } catch {
      // L'ajout du véhicule est déjà effectif; l'activation se recalculera au prochain chargement.
    }

    closeDialog();
    form.reset();
    resetLegalFiles();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Ajouter un véhicule</DialogTitle>
          <DialogDescription>
            Informations du véhicule et pièces de circulation. Référentiel commun CEMAC, à compléter selon les exigences du pays d'immatriculation.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="registration" render={({ field }) => (
              <FormItem>
                <FormLabel>Immatriculation</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={registrationRule.placeholder}
                    maxLength={registrationRule.maxInputLength}
                    autoCapitalize="characters"
                    spellCheck={false}
                    onChange={(event) => {
                      const next = sanitizeVehicleRegistrationInput(event.target.value).slice(0, registrationRule.maxInputLength);
                      field.onChange(next);
                      const error = next ? validateVehicleRegistrationForCountry(next, countryCode) : null;
                      if (error) form.setError("registration", { type: "manual", message: error });
                      else form.clearErrors("registration");
                    }}
                    onBlur={(event) => {
                      field.onChange(normalizeVehicleRegistration(event.target.value));
                      field.onBlur();
                    }}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Règle {countryCode} · {registrationRule.minCompactLength} à {registrationRule.maxCompactLength} caractères alphanumériques.
                </p>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="subscription_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Abonnement</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger aria-label="Selectionner un abonnement"><SelectValue placeholder="Choisir un abonnement" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {subscriptionOptions.map((subscription) => {
                      const availableSlots = availableSlotsForCreation(subscription);
                      return (
                        <SelectItem key={subscription.id} value={subscription.id}>
                          {subscription.planName ?? subscription.planCode ?? "Abonnement"} - {subscription.status === "inactive" ? "en attente · " : ""}{availableSlots} slot{availableSlots > 1 ? "s" : ""} disponible{availableSlots > 1 ? "s" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
                {!subscriptionsLoading && subscriptionOptions.length === 0 ? <p className="text-xs text-muted-foreground">Aucun abonnement actif ou en attente avec un slot disponible.</p> : null}
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="brand" render={({ field }) => <FormItem><FormLabel>Marque</FormLabel><FormControl><Input placeholder="Toyota" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="model" render={({ field }) => <FormItem><FormLabel>Modèle</FormLabel><FormControl><Input placeholder="Corolla" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="year" render={({ field }) => <FormItem><FormLabel>Année</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="current_km" render={({ field }) => <FormItem><FormLabel>Kilométrage</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
            </div>

            <div className="space-y-4 border-t pt-5">
              <div>
                <h3 className="text-sm font-semibold">Documents obligatoires du véhicule</h3>
                <p className="text-xs text-muted-foreground">Carte grise, assurance responsabilité civile et visite technique valide.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="registration_certificate_number" render={({ field }) => <FormItem><FormLabel>Numéro de carte grise</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <div className="space-y-2"><FormLabel>Carte grise</FormLabel><Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setRegistrationCertificateFile(e.target.files?.[0] ?? null)} /></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="insurer_name" render={({ field }) => <FormItem><FormLabel>Compagnie d'assurance</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="insurance_policy_number" render={({ field }) => <FormItem><FormLabel>Numéro de police</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="insurance_issued_at" render={({ field }) => <FormItem><FormLabel>Assurance valable depuis</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="insurance_expires_at" render={({ field }) => <FormItem><FormLabel>Assurance expire le</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                <div className="space-y-2 sm:col-span-2"><FormLabel>Attestation d'assurance</FormLabel><Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setInsuranceFile(e.target.files?.[0] ?? null)} /></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="technical_inspection_number" render={({ field }) => <FormItem><FormLabel>Numéro de visite technique</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="technical_inspection_issued_at" render={({ field }) => <FormItem><FormLabel>Visite effectuée le</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="technical_inspection_expires_at" render={({ field }) => <FormItem><FormLabel>Visite expire le</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                <div className="space-y-2"><FormLabel>Certificat de visite technique</FormLabel><Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setTechnicalInspectionFile(e.target.files?.[0] ?? null)} /></div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-5">
              <div>
                <h3 className="text-sm font-semibold">Pièces nationales complémentaires</h3>
                <p className="text-xs text-muted-foreground">À renseigner lorsque le pays ou l'usage professionnel du véhicule l'exige.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="road_tax_reference" render={({ field }) => <FormItem><FormLabel>Référence vignette / taxe routière</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="road_tax_expires_at" render={({ field }) => <FormItem><FormLabel>Expiration taxe routière</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="transport_license_number" render={({ field }) => <FormItem><FormLabel>Licence de transport</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="transport_license_expires_at" render={({ field }) => <FormItem><FormLabel>Expiration licence</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>Annuler</Button>
              <Button type="submit" disabled={createVehicle.isPending || subscriptionsLoading || subscriptionOptions.length === 0}>
                {createVehicle.isPending ? "Enregistrement..." : "Ajouter le véhicule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleFormDialog;
