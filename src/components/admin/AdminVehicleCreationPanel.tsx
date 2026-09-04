import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getVehicleRegistrationRule,
  normalizeVehicleRegistration,
  validateVehicleRegistrationForCountry,
} from "@/domain/vehicleRegistration";

interface AdminFleetOption {
  id: string;
  name: string;
  org_name: string | null;
  country_code: string;
  vehicle_count: number;
}

interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface RpcClient {
  rpc<T = unknown>(
    fn: string,
    params?: Record<string, unknown>,
  ): Promise<RpcResult<T>>;
}

const rpcClient = supabase as unknown as RpcClient;

async function loadFleetOptions(): Promise<AdminFleetOption[]> {
  const { data, error } = await rpcClient.rpc<unknown>(
    "admin_list_fleets_for_vehicle_creation",
  );

  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];

  return data.filter(
    (value): value is AdminFleetOption =>
      typeof value === "object" &&
      value !== null &&
      typeof (value as AdminFleetOption).id === "string" &&
      typeof (value as AdminFleetOption).name === "string" &&
      typeof (value as AdminFleetOption).country_code === "string",
  );
}

function mapAdminVehicleError(message: string): string {
  if (message.includes("vehicle_registration_already_used")) {
    return "Cette immatriculation est déjà utilisée par un autre véhicule.";
  }
  if (message.includes("vehicle_registration_invalid_length")) {
    return "Le format de l'immatriculation ne correspond pas au pays de la flotte.";
  }
  if (message.includes("vehicle_registration_invalid_characters")) {
    return "L'immatriculation contient des caractères non autorisés.";
  }
  if (message.includes("fleet_not_found")) {
    return "Flotte introuvable.";
  }
  return message;
}

export function AdminVehicleCreationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fleetId, setFleetId] = useState("");
  const [registration, setRegistration] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [currentKm, setCurrentKm] = useState("0");
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const fleetsQuery = useQuery({
    queryKey: ["admin", "vehicle-fleets"],
    queryFn: loadFleetOptions,
    staleTime: 60_000,
  });

  const selectedFleet = useMemo(
    () => (fleetsQuery.data ?? []).find((fleet) => fleet.id === fleetId) ?? null,
    [fleetsQuery.data, fleetId],
  );

  const registrationRule = getVehicleRegistrationRule(
    selectedFleet?.country_code ?? "CM",
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFleet) throw new Error("Sélectionnez une flotte.");

      const validationError = validateVehicleRegistrationForCountry(
        registration,
        selectedFleet.country_code,
      );
      if (validationError) {
        setRegistrationError(validationError);
        throw new Error(validationError);
      }

      const parsedYear = Number(year);
      const parsedKm = Number(currentKm);

      if (!Number.isInteger(parsedYear) || parsedYear < 1990 || parsedYear > new Date().getFullYear() + 1) {
        throw new Error("Année invalide.");
      }
      if (!Number.isFinite(parsedKm) || parsedKm < 0) {
        throw new Error("Kilométrage invalide.");
      }

      const { data, error } = await rpcClient.rpc(
        "admin_create_vehicle",
        {
          p_fleet_id: selectedFleet.id,
          p_registration: normalizeVehicleRegistration(registration),
          p_brand: brand.trim() || null,
          p_model: model.trim() || null,
          p_year: parsedYear,
          p_current_km: Math.floor(parsedKm),
        },
      );

      if (error) throw new Error(mapAdminVehicleError(error.message));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Véhicule créé",
        description:
          "Le véhicule a été ajouté par l'administration. Les limites d'abonnement ont été ignorées, mais l'immatriculation reste unique.",
      });
      setRegistration("");
      setBrand("");
      setModel("");
      setYear(String(new Date().getFullYear()));
      setCurrentKm("0");
      setRegistrationError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "vehicle-fleets"] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles-list"] });
    },
    onError: (error) => {
      toast({
        title: "Création impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    },
  });

  return (
    <section className="max-w-3xl space-y-5 rounded-lg border p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" aria-hidden />
            <h2 className="text-lg font-semibold">Créer un véhicule pour une flotte</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            L'admin peut créer un véhicule même si la flotte n'a plus de place disponible.
            L'immatriculation reste obligatoirement unique sur toute la plateforme.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fleetsQuery.isFetching}
          onClick={() => void fleetsQuery.refetch()}
        >
          {fleetsQuery.isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Actualiser
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Flotte</Label>
        <Select
          value={fleetId}
          onValueChange={(value) => {
            setFleetId(value);
            setRegistration("");
            setRegistrationError(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une flotte" />
          </SelectTrigger>
          <SelectContent>
            {(fleetsQuery.data ?? []).map((fleet) => (
              <SelectItem key={fleet.id} value={fleet.id}>
                {fleet.org_name ? `${fleet.org_name} · ` : ""}
                {fleet.name} · {fleet.country_code} · {fleet.vehicle_count} véhicule
                {fleet.vehicle_count > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedFleet ? (
        <>
          <div className="space-y-2">
            <Label>{registrationRule.label}</Label>
            <Input
              value={registration}
              placeholder={registrationRule.placeholder}
              maxLength={registrationRule.maxInputLength}
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(event) => {
                const next = normalizeVehicleRegistration(event.target.value).slice(
                  0,
                  registrationRule.maxInputLength,
                );
                setRegistration(next);
                setRegistrationError(
                  next
                    ? validateVehicleRegistrationForCountry(
                        next,
                        selectedFleet.country_code,
                      )
                    : null,
                );
              }}
            />
            <p className="text-xs text-muted-foreground">
              Pays {selectedFleet.country_code} · {registrationRule.minCompactLength} à{" "}
              {registrationRule.maxCompactLength} caractères utiles · plaque unique globale.
            </p>
            {registrationError ? (
              <p className="text-sm text-destructive">{registrationError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Marque</Label>
              <Input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Toyota" />
            </div>
            <div className="space-y-2">
              <Label>Modèle</Label>
              <Input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Hilux" />
            </div>
            <div className="space-y-2">
              <Label>Année</Label>
              <Input type="number" min={1990} max={new Date().getFullYear() + 1} value={year} onChange={(event) => setYear(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Kilométrage</Label>
              <Input type="number" min={0} value={currentKm} onChange={(event) => setCurrentKm(event.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={
                createMutation.isPending ||
                Boolean(registrationError) ||
                !registration.trim()
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Créer le véhicule
            </Button>
          </div>
        </>
      ) : fleetsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des flottes...</p>
      ) : null}
    </section>
  );
}
