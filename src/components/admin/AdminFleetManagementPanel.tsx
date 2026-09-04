import { useMemo, useState } from "react";
import {
  Car,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  Trash2,
  UnlockKeyhole,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
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

interface AdminVehicle {
  id: string;
  registration: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  current_km: number;
  status: string;
  created_at: string;
  registration_locked: boolean;
  registration_released_at: string | null;
}

interface RegistrationLock {
  normalized_registration: string;
  fleet_id: string;
  fleet_name: string | null;
  locked: boolean;
  first_used_at: string;
  released_at: string | null;
  active_vehicle_id: string | null;
  active_registration: string | null;
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

function parseArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function loadFleets(): Promise<AdminFleetOption[]> {
  const { data, error } = await rpcClient.rpc("admin_list_fleets_for_vehicle_creation");
  if (error) throw new Error(error.message);
  return parseArray<AdminFleetOption>(data);
}

async function loadVehicles(fleetId: string): Promise<AdminVehicle[]> {
  const { data, error } = await rpcClient.rpc("admin_list_fleet_vehicles", {
    p_fleet_id: fleetId,
  });
  if (error) throw new Error(error.message);
  return parseArray<AdminVehicle>(data);
}

async function loadLocks(fleetId: string): Promise<RegistrationLock[]> {
  const { data, error } = await rpcClient.rpc("admin_list_registration_locks", {
    p_fleet_id: fleetId,
  });
  if (error) throw new Error(error.message);
  return parseArray<RegistrationLock>(data);
}

function mapVehicleError(message: string): string {
  if (
    message.includes("vehicle_registration_already_used") ||
    message.includes("vehicle_registration_locked_to_other_fleet")
  ) {
    return "Cette immatriculation est réservée à une autre flotte.";
  }
  if (message.includes("vehicle_registration_invalid_length")) {
    return "Le format de l'immatriculation ne correspond pas au pays de la flotte.";
  }
  if (message.includes("vehicle_registration_invalid_characters")) {
    return "L'immatriculation contient des caractères non autorisés.";
  }
  if (message.includes("fleet_not_found")) return "Flotte introuvable.";
  if (message.includes("vehicle_not_found")) return "Véhicule introuvable.";
  return message;
}

export function AdminFleetManagementPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fleetSearch, setFleetSearch] = useState("");
  const [fleetId, setFleetId] = useState("");
  const [registration, setRegistration] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [currentKm, setCurrentKm] = useState("0");
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const fleetsQuery = useQuery({
    queryKey: ["admin", "vehicle-fleets"],
    queryFn: loadFleets,
    staleTime: 60_000,
  });

  const fleets = fleetsQuery.data ?? [];
  const filteredFleets = useMemo(() => {
    const query = fleetSearch.trim().toLowerCase();
    if (!query) return fleets;
    return fleets.filter((fleet) =>
      [fleet.name, fleet.org_name ?? "", fleet.country_code]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [fleetSearch, fleets]);

  const selectedFleet =
    fleets.find((fleet) => fleet.id === fleetId) ?? filteredFleets[0] ?? null;
  const selectedFleetId = selectedFleet?.id ?? "";

  const vehiclesQuery = useQuery({
    queryKey: ["admin", "fleet-vehicles", selectedFleetId],
    queryFn: () => loadVehicles(selectedFleetId),
    enabled: Boolean(selectedFleetId),
  });

  const locksQuery = useQuery({
    queryKey: ["admin", "registration-locks", selectedFleetId],
    queryFn: () => loadLocks(selectedFleetId),
    enabled: Boolean(selectedFleetId),
  });

  const registrationRule = getVehicleRegistrationRule(
    selectedFleet?.country_code ?? "CM",
  );

  const refreshFleet = () => {
    if (!selectedFleetId) return;
    void queryClient.invalidateQueries({ queryKey: ["admin", "vehicle-fleets"] });
    void queryClient.invalidateQueries({
      queryKey: ["admin", "fleet-vehicles", selectedFleetId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin", "registration-locks", selectedFleetId],
    });
  };

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

      if (
        !Number.isInteger(parsedYear) ||
        parsedYear < 1990 ||
        parsedYear > new Date().getFullYear() + 1
      ) {
        throw new Error("Année invalide.");
      }
      if (!Number.isFinite(parsedKm) || parsedKm < 0) {
        throw new Error("Kilométrage invalide.");
      }

      const { data, error } = await rpcClient.rpc("admin_create_vehicle", {
        p_fleet_id: selectedFleet.id,
        p_registration: normalizeVehicleRegistration(registration),
        p_brand: brand.trim() || null,
        p_model: model.trim() || null,
        p_year: parsedYear,
        p_current_km: Math.floor(parsedKm),
      });

      if (error) throw new Error(mapVehicleError(error.message));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Véhicule créé",
        description:
          "Les limites de capacité ont été contournées. La règle d'immatriculation reste appliquée.",
      });
      setRegistration("");
      setBrand("");
      setModel("");
      setYear(String(new Date().getFullYear()));
      setCurrentKm("0");
      setRegistrationError(null);
      refreshFleet();
    },
    onError: (error) => {
      toast({
        title: "Création impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (vehicle: AdminVehicle) => {
      const { data, error } = await rpcClient.rpc("admin_delete_vehicle", {
        p_vehicle_id: vehicle.id,
      });
      if (error) throw new Error(mapVehicleError(error.message));
      const result = data as { ok?: boolean; error?: string } | null;
      if (result?.ok !== true) throw new Error(result?.error ?? "delete_failed");
      return vehicle;
    },
    onSuccess: (vehicle) => {
      toast({
        title: "Véhicule supprimé",
        description: `${vehicle.registration} reste réservé à cette flotte et peut y être recréé.`,
      });
      refreshFleet();
    },
    onError: (error) => {
      toast({
        title: "Suppression impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (lock: RegistrationLock) => {
      const { data, error } = await rpcClient.rpc(
        "admin_release_vehicle_registration",
        { p_registration: lock.normalized_registration },
      );
      if (error) throw new Error(mapVehicleError(error.message));
      const result = data as { ok?: boolean; error?: string } | null;
      if (result?.ok !== true) throw new Error(result?.error ?? "unlock_failed");
      return lock;
    },
    onSuccess: (lock) => {
      toast({
        title: "Immatriculation libérée",
        description: `${lock.normalized_registration} pourra être réattribuée à une autre flotte lorsque plus aucun véhicule actif ne l'utilise.`,
      });
      refreshFleet();
    },
    onError: (error) => {
      toast({
        title: "Libération impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <h2 className="font-semibold">Flottes</h2>
          <p className="text-sm text-muted-foreground">
            Sélectionnez une flotte pour gérer ses véhicules.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={fleetSearch}
            onChange={(event) => setFleetSearch(event.target.value)}
            placeholder="Rechercher une flotte"
            className="pl-9"
          />
        </div>

        <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
          {filteredFleets.map((fleet) => {
            const active = fleet.id === selectedFleetId;
            return (
              <button
                key={fleet.id}
                type="button"
                onClick={() => {
                  setFleetId(fleet.id);
                  setRegistration("");
                  setRegistrationError(null);
                }}
                className={
                  "w-full rounded-lg border p-3 text-left transition " +
                  (active
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/40 hover:bg-muted/40")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{fleet.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fleet.org_name || "Organisation inconnue"}
                    </p>
                  </div>
                  <Badge variant="secondary">{fleet.country_code}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {fleet.vehicle_count} véhicule{fleet.vehicle_count > 1 ? "s" : ""}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="min-w-0 space-y-6">
        {selectedFleet ? (
          <>
            <section className="rounded-xl border bg-card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{selectedFleet.name}</h2>
                    <Badge variant="outline">{selectedFleet.country_code}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedFleet.org_name || "Organisation inconnue"} ·{" "}
                    {vehiclesQuery.data?.length ?? selectedFleet.vehicle_count} véhicule
                    {(vehiclesQuery.data?.length ?? selectedFleet.vehicle_count) > 1 ? "s" : ""}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={refreshFleet}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5">
              <div className="mb-4">
                <h3 className="font-semibold">Ajouter un véhicule</h3>
                <p className="text-sm text-muted-foreground">
                  L'admin peut dépasser les limites d'abonnement. La plaque reste protégée.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{registrationRule.label}</Label>
                  <Input
                    value={registration}
                    placeholder={registrationRule.placeholder}
                    maxLength={registrationRule.maxInputLength}
                    autoCapitalize="characters"
                    spellCheck={false}
                    onChange={(event) => {
                      const next = normalizeVehicleRegistration(
                        event.target.value,
                      ).slice(0, registrationRule.maxInputLength);
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
                    {registrationRule.minCompactLength} à{" "}
                    {registrationRule.maxCompactLength} caractères utiles.
                  </p>
                  {registrationError ? (
                    <p className="text-xs text-destructive">{registrationError}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Marque</Label>
                  <Input
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    placeholder="Toyota"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modèle</Label>
                  <Input
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder="Hilux"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Année</Label>
                  <Input
                    type="number"
                    min={1990}
                    max={new Date().getFullYear() + 1}
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kilométrage</Label>
                  <Input
                    type="number"
                    min={0}
                    value={currentKm}
                    onChange={(event) => setCurrentKm(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
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
                  ) : (
                    <Car className="mr-2 h-4 w-4" />
                  )}
                  Créer le véhicule
                </Button>
              </div>
            </section>

            <section className="rounded-xl border bg-card">
              <div className="border-b p-5">
                <h3 className="font-semibold">Véhicules de la flotte</h3>
                <p className="text-sm text-muted-foreground">
                  Une plaque supprimée reste réservée à cette flotte et peut y être réutilisée.
                </p>
              </div>

              <div className="divide-y">
                {(vehiclesQuery.data ?? []).map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">
                          {vehicle.registration}
                        </span>
                        <Badge variant={vehicle.status === "ok" ? "secondary" : "outline"}>
                          {vehicle.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[vehicle.brand, vehicle.model, vehicle.year]
                          .filter(Boolean)
                          .join(" · ") || "Informations véhicule non renseignées"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.current_km.toLocaleString("fr-FR")} km
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(vehicle)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </Button>
                  </div>
                ))}

                {!vehiclesQuery.isLoading && (vehiclesQuery.data ?? []).length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">
                    Aucun véhicule dans cette flotte.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border bg-card">
              <div className="border-b p-5">
                <h3 className="font-semibold">Réservations d'immatriculation</h3>
                <p className="text-sm text-muted-foreground">
                  Une réservation empêche une autre flotte de récupérer une plaque déjà utilisée ici.
                </p>
              </div>

              <div className="divide-y">
                {(locksQuery.data ?? []).map((lock) => (
                  <div
                    key={lock.normalized_registration}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">
                          {lock.active_registration || lock.normalized_registration}
                        </span>
                        {lock.locked ? (
                          <Badge variant="outline" className="gap-1">
                            <LockKeyhole className="h-3 w-3" />
                            Réservée
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <UnlockKeyhole className="h-3 w-3" />
                            Libérée
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lock.active_vehicle_id
                          ? "Véhicule actif : la plaque reste de toute façon unique."
                          : "Aucun véhicule actif avec cette plaque."}
                      </p>
                    </div>

                    {lock.locked ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={unlockMutation.isPending}
                        onClick={() => unlockMutation.mutate(lock)}
                      >
                        <UnlockKeyhole className="mr-2 h-4 w-4" />
                        Enlever le verrou
                      </Button>
                    ) : null}
                  </div>
                ))}

                {!locksQuery.isLoading && (locksQuery.data ?? []).length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">
                    Aucune immatriculation réservée pour cette flotte.
                  </p>
                ) : null}
              </div>
            </section>
          </>
        ) : fleetsQuery.isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des flottes...
          </div>
        ) : (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            Aucune flotte disponible.
          </div>
        )}
      </main>
    </div>
  );
}
