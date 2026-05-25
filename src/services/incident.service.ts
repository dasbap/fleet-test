import { IncidentRepository } from '@/repositories/incident.repository';
import type { IncidentEvidenceRepository } from '@/repositories/incident-evidence.repository';
import type {
  Incident,
  IncidentInsert,
  IncidentUpdate,
  IncidentFilters,
  IncidentSeverity,
} from '@/repositories/incident.repository';
import { isIncidentCategory } from '@/domain/constants/incidentCategories';
import { incidentCreateSchema } from '@/domain/schemas/incident.schema';
import { parseSchemaOrThrow } from '@/domain/lib/parseSchema';

/**
 * Service pour la logique métier des incidents
 */
export class IncidentService {
  constructor(
    private repository: IncidentRepository,
    private evidenceRepository?: IncidentEvidenceRepository,
  ) {}

  private validateIncidentCategory(category: string | null | undefined): void {
    if (category == null || category === '') return;
    if (!isIncidentCategory(category)) {
      throw new Error("Catégorie d'incident invalide");
    }
  }

  /**
   * Création avec téléversement optionnel d’une photo (bucket `incident-evidence`).
   */
  async declareIncidentWithOptionalEvidence(params: {
    fleetId: string;
    incident: IncidentInsert;
    evidenceDataUrl?: string | null;
  }): Promise<Incident> {
    if (!params.fleetId.trim()) {
      throw new Error('L\'identifiant de la flotte est requis pour enregistrer la preuve');
    }
    const { incident, evidenceDataUrl } = params;
    this.validateIncidentCategory(incident.incident_category);

    let evidence_path = incident.evidence_path ?? null;
    if (evidenceDataUrl != null && evidenceDataUrl.trim() !== '') {
      if (!this.evidenceRepository) {
        throw new Error('Le téléversement de photo est momentanément indisponible.');
      }
      evidence_path = await this.evidenceRepository.uploadFromDataUrl(
        params.fleetId,
        incident.vehicle_id,
        evidenceDataUrl,
      );
    }

    return this.createIncident({
      ...incident,
      evidence_path,
    });
  }

  /**
   * Récupère tous les incidents d'une flotte
   */
  async getIncidents(fleetId?: string): Promise<Incident[]> {
    const filters: IncidentFilters = {};
    if (fleetId) {
      filters.fleet_id = fleetId;
    }
    return this.repository.findAll(filters);
  }

  /**
   * Récupère tous les incidents avec filtres
   */
  async getAllIncidents(filters?: IncidentFilters): Promise<Incident[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Récupère un incident par son ID
   */
  async getIncidentById(id: string): Promise<Incident | null> {
    if (!id) {
      throw new Error('L\'ID de l\'incident est requis');
    }
    return this.repository.findById(id);
  }

  /**
   * Crée un nouvel incident avec validation métier
   */
  async createIncident(data: IncidentInsert): Promise<Incident> {
    const parsed = parseSchemaOrThrow(incidentCreateSchema, data);
    this.validateIncidentCategory(parsed.incident_category ?? null);

    return this.repository.create({
      ...parsed,
      severity: (parsed.severity ?? 'medium') as IncidentSeverity,
      incident_category: parsed.incident_category ?? null,
    });
  }

  /**
   * Met à jour un incident avec validation métier
   */
  async updateIncident(id: string, updates: IncidentUpdate): Promise<Incident> {
    if (!id) {
      throw new Error('L\'ID de l\'incident est requis');
    }

    const normalizedUpdates: IncidentUpdate = { ...updates };
    if (updates.description) {
      normalizedUpdates.description = updates.description.trim();
    }

    return this.repository.update(id, normalizedUpdates);
  }

  /**
   * Supprime un incident avec validation métier
   */
  async deleteIncident(id: string): Promise<void> {
    if (!id) {
      throw new Error('L\'ID de l\'incident est requis');
    }

    const incident = await this.repository.findById(id);
    if (!incident) {
      throw new Error('Incident introuvable');
    }

    return this.repository.delete(id);
  }
}
