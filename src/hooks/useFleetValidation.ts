import { useQuery } from "@tanstack/react-query";
import { FleetValidationRepository } from "@/repositories/fleet-validation.repository";
import { FleetValidationService } from "@/services/fleet-validation.service";

const repository = new FleetValidationRepository();
const fleetValidationService = new FleetValidationService(repository);

export const fleetValidationQueryKeys = {
  all: ["fleet-validation"] as const,
  fleet: (fleetId: string) => ["fleet-validation", "fleet", fleetId] as const,
  creneau: (creneauId: string) => ["fleet-validation", "creneau", creneauId] as const,
  kpis: (fleetId: string) => ["fleet-validation", "kpis", fleetId] as const,
};

export function useCreneauxValidations(fleetId?: string) {
  return useQuery({
    queryKey: fleetValidationQueryKeys.fleet(fleetId ?? ""),
    queryFn: () => fleetValidationService.getValidationsByFleet(fleetId!),
    enabled: Boolean(fleetId),
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}

export function useCreneauActifValidation(creneauId?: string) {
  return useQuery({
    queryKey: fleetValidationQueryKeys.creneau(creneauId ?? ""),
    queryFn: () => fleetValidationService.getCreneauActifById(creneauId!),
    enabled: Boolean(creneauId),
    staleTime: 30_000,
  });
}

export function useKpisFlotte(fleetId?: string) {
  return useQuery({
    queryKey: fleetValidationQueryKeys.kpis(fleetId ?? ""),
    queryFn: () => fleetValidationService.getFleetKpis(fleetId!),
    enabled: Boolean(fleetId),
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}

export function useClosureProofSignedUrl(modeRendu: string, valeur: string | null) {
  return useQuery({
    queryKey: ["closure-proof-url", modeRendu, valeur],
    queryFn: () => fleetValidationService.resolveProofSignedUrl(valeur!),
    enabled: modeRendu === "storage" && Boolean(valeur),
    staleTime: 3_000_000,
  });
}
