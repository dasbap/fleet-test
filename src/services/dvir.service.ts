import {
  DvirRepository,
  type DvirChecklistConfigItem,
  type DvirInsertInput,
  type DvirItemStatus,
  type DvirListFilters,
  type DvirListItem,
  type DvirStatus,
} from "@/repositories/dvir.repository";

export interface DvirCreateInput {
  fleetId: string;
  vehicleId: string;
  inspectedBy: string;
  inspectionType: DvirInsertInput["inspection_type"];
  items: Record<string, { status: DvirItemStatus; note?: string }>;
  notes?: string | null;
  odometerKm?: number | null;
}

export class DvirService {
  constructor(private repository: DvirRepository) {}

  async list(filters: DvirListFilters): Promise<DvirListItem[]> {
    if (!filters.fleetId) {
      throw new Error("L'ID de flotte est requis");
    }
    return this.repository.getList(filters);
  }

  async getChecklistConfig(): Promise<DvirChecklistConfigItem[]> {
    return this.repository.getChecklistConfig();
  }

  async getById(id: string): Promise<DvirListItem | null> {
    if (!id) {
      throw new Error("L'identifiant DVIR est requis");
    }
    return this.repository.getById(id);
  }

  async create(input: DvirCreateInput): Promise<void> {
    this.validateCreateInput(input);

    const normalizedItems = this.normalizeItems(input.items);
    const overallStatus = this.computeOverallStatus(normalizedItems);
    const payload: DvirInsertInput = {
      fleet_id: input.fleetId,
      vehicle_id: input.vehicleId,
      inspected_by: input.inspectedBy,
      inspection_type: input.inspectionType,
      items: normalizedItems,
      overall_status: overallStatus,
      notes: this.sanitizeText(input.notes),
      odometer_km: input.odometerKm ?? null,
    };

    await this.repository.create(payload);
  }

  private validateCreateInput(input: DvirCreateInput): void {
    if (!input.fleetId) throw new Error("L'ID de flotte est requis");
    if (!input.vehicleId) throw new Error("L'ID du véhicule est requis");
    if (!input.inspectedBy) throw new Error("L'ID de l'inspecteur est requis");
    if (!input.inspectionType) throw new Error("Le type d'inspection est requis");
    if (input.odometerKm != null && input.odometerKm < 0) {
      throw new Error("Le kilométrage doit être positif");
    }
  }

  private normalizeItems(items: DvirCreateInput["items"]): DvirInsertInput["items"] {
    const normalized: DvirInsertInput["items"] = {};

    for (const [key, value] of Object.entries(items)) {
      const status = value?.status;
      if (!status || !["ok", "defaut", "defect", "na"].includes(status)) {
        throw new Error(`Statut invalide pour l'item ${key}`);
      }

      normalized[key] = {
        status,
        note: this.sanitizeText(value.note),
      };
    }

    return normalized;
  }

  private computeOverallStatus(items: DvirInsertInput["items"]): DvirStatus {
    const criticalKeys = new Set(["freins_service", "frein_main", "direction", "pneus"]);
    let hasNonCriticalIssue = false;

    for (const [key, item] of Object.entries(items)) {
      const isDefect = item.status === "defaut" || item.status === "defect";
      if (!isDefect) {
        continue;
      }

      if (criticalKeys.has(key)) {
        return "unsafe";
      }
      hasNonCriticalIssue = true;
    }

    return hasNonCriticalIssue ? "minor_issues" : "ok";
  }

  private sanitizeText(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length > 0 ? normalized : null;
  }
}
