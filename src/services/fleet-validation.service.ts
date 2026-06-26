import { FleetValidationRepository } from "@/repositories/fleet-validation.repository";
import type {
  CreneauValidationLigne,
  CreneauValidationRow,
  KpisFlotteData,
  StatutValidation,
} from "@/types/fleet-validation";

export function calculerStatutValidation(
  ligne: Omit<CreneauValidationLigne, "statut_global">,
): StatutValidation {
  if (!ligne.dvir_pre_count) {
    return "alerte";
  }
  if (ligne.dvir_pre_count > 0 && ligne.carburant_saisies > 0 && ligne.dvir_post_count > 0) {
    return ligne.cloture_statut === "validated" ? "complet" : "en_attente";
  }
  return "incomplet";
}

function enrichirLigne(row: CreneauValidationRow): CreneauValidationLigne {
  return {
    ...row,
    statut_global: calculerStatutValidation(row),
  };
}

export class FleetValidationService {
  constructor(private readonly repository: FleetValidationRepository) {}

  async getValidationsByFleet(fleetId: string): Promise<CreneauValidationLigne[]> {
    if (!fleetId) {
      return [];
    }
    const rows = await this.repository.findActiveValidationsByFleet(fleetId);
    return rows.map(enrichirLigne);
  }

  async getCreneauActifById(creneauId: string): Promise<CreneauValidationLigne | null> {
    if (!creneauId) {
      return null;
    }
    const row = await this.repository.findActiveValidationByCreneauId(creneauId);
    return row ? enrichirLigne(row) : null;
  }

  async getFleetKpis(fleetId: string): Promise<KpisFlotteData | null> {
    if (!fleetId) {
      return null;
    }
    return this.repository.findFleetKpis(fleetId);
  }

  async resolveProofSignedUrl(storedValue: string): Promise<string | null> {
    if (!storedValue?.trim()) {
      return null;
    }
    return this.repository.getClosureProofSignedUrl(storedValue);
  }
}
