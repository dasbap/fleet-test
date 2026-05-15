import { computeOverallDvirStatus } from "@/lib/dvir-status";
import {
  DvirRepository,
  type DvirChecklistConfigItem,
  type DvirDetail,
  type DvirInsertInput,
  type DvirItemStatus,
  type DvirListFilters,
  type DvirListItem,
  type DvirUpdatePayload,
} from "@/repositories/dvir.repository";

export interface DvirCreateInput {
  fleetId: string;
  vehicleId: string;
  inspectedBy: string;
  inspectionType: DvirInsertInput["inspection_type"];
  items: Record<string, { status: DvirItemStatus; note?: string }>;
  notes?: string | null;
  odometerKm?: number | null;
  photoUrls?: string[];
}

export interface DvirUpdateInput {
  id: string;
  items: Record<string, { status: DvirItemStatus; note?: string }>;
  notes?: string | null;
  odometerKm?: number | null;
  inspectionType: DvirInsertInput["inspection_type"];
}

const VALID_ITEM_STATUSES = new Set(["ok", "defaut", "defect", "na"]);
const MAX_NOTES_LENGTH = 2000;
const MAX_ITEM_NOTE_LENGTH = 500;

export class DvirService {
  constructor(private repository: DvirRepository) {}

  async list(filters: DvirListFilters): Promise<DvirListItem[]> {
    if (!filters.fleetId) throw new Error("L'ID de flotte est requis");
    return this.repository.getList(filters);
  }

  async getChecklistConfig(): Promise<DvirChecklistConfigItem[]> {
    return this.repository.getChecklistConfig();
  }

  async getById(id: string): Promise<DvirDetail | null> {
    if (!id) throw new Error("L'identifiant DVIR est requis");
    return this.repository.getById(id);
  }

  async create(input: DvirCreateInput, photoUrls: string[] = []): Promise<void> {
    this.validateInput(input);

    const normalizedItems = this.normalizeItems(input.items);
    await this.repository.create({
      fleet_id: input.fleetId,
      vehicle_id: input.vehicleId,
      inspected_by: input.inspectedBy,
      inspection_type: input.inspectionType,
      items: normalizedItems,
      overall_status: computeOverallDvirStatus(normalizedItems),
      notes: this.sanitizeText(input.notes, MAX_NOTES_LENGTH),
      odometer_km: input.odometerKm ?? null,
      photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
    });
  }

  async update(input: DvirUpdateInput): Promise<void> {
    if (!input.id) throw new Error("L'identifiant DVIR est requis");
    this.validateUpdateInput(input);

    const normalizedItems = this.normalizeItems(input.items);
    await this.repository.update(input.id, {
      items: normalizedItems,
      overall_status: computeOverallDvirStatus(normalizedItems),
      notes: this.sanitizeText(input.notes, MAX_NOTES_LENGTH),
      odometer_km: input.odometerKm ?? null,
      inspection_type: input.inspectionType,
    });
  }

  private validateUpdateInput(input: DvirUpdateInput): void {
    if (!input.inspectionType) throw new Error("Le type d'inspection est requis");
    if (input.odometerKm != null && (input.odometerKm < 0 || input.odometerKm > 9_999_999)) {
      throw new Error("Kilométrage invalide (0–9 999 999)");
    }
  }

  private validateInput(input: Pick<DvirCreateInput, "fleetId" | "vehicleId" | "inspectedBy" | "inspectionType" | "odometerKm">): void {
    if (!("fleetId" in input) || !input.fleetId) throw new Error("L'ID de flotte est requis");
    if (!input.vehicleId) throw new Error("L'ID du véhicule est requis");
    if (!input.inspectedBy) throw new Error("L'ID de l'inspecteur est requis");
    if (!input.inspectionType) throw new Error("Le type d'inspection est requis");
    if (input.odometerKm != null && (input.odometerKm < 0 || input.odometerKm > 9_999_999)) {
      throw new Error("Kilométrage invalide (0–9 999 999)");
    }
  }

  private normalizeItems(items: DvirCreateInput["items"]): DvirInsertInput["items"] {
    const normalized: DvirInsertInput["items"] = {};
    for (const [key, value] of Object.entries(items)) {
      if (!value?.status || !VALID_ITEM_STATUSES.has(value.status)) {
        throw new Error(`Statut invalide pour l'item « ${key} »`);
      }
      normalized[key] = {
        status: value.status,
        note: this.sanitizeText(value.note, MAX_ITEM_NOTE_LENGTH),
      };
    }
    return normalized;
  }

  private sanitizeText(value?: string | null, maxLength = MAX_NOTES_LENGTH): string | null {
    if (!value) return null;
    const trimmed = value.trim().replace(/\s+/g, " ");
    return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
  }
}
