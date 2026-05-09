import { MaintenanceRepository } from '@/repositories/maintenance.repository';
import type {
  MaintenanceJob,
  MaintenanceJobInsert,
  MaintenanceJobUpdate,
  MaintenanceJobFilters,
  JobStatus,
  Priority,
  MaintenanceEvidence,
  MaintenanceChecklist,
  MaintenanceEvidenceInsert,
  MaintenanceChecklistInsert,
} from '@/repositories/maintenance.repository';

/**
 * Service pour la logique métier des travaux de maintenance
 */
export class MaintenanceService {
  constructor(private repository: MaintenanceRepository) {}

  /**
   * Récupère tous les travaux de maintenance d'une flotte
   */
  async getMaintenanceJobs(fleetId?: string, status?: JobStatus): Promise<MaintenanceJob[]> {
    const filters: MaintenanceJobFilters = {};
    if (fleetId) {
      filters.fleet_id = fleetId;
    }
    if (status) {
      filters.status = status;
    }
    return this.repository.findAll(filters);
  }

  /**
   * Récupère tous les travaux de maintenance avec filtres
   */
  async getAllMaintenanceJobs(filters?: MaintenanceJobFilters): Promise<MaintenanceJob[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Récupère un travail de maintenance par son ID
   */
  async getMaintenanceJobById(id: string): Promise<MaintenanceJob | null> {
    if (!id) {
      throw new Error('L\'ID du travail de maintenance est requis');
    }
    return this.repository.findById(id);
  }

  /**
   * Récupère un travail avec preuves et checklist
   */
  async getMaintenanceJobWithDetails(
    jobId: string
  ): Promise<(MaintenanceJob & { evidence: MaintenanceEvidence[]; checklist: MaintenanceChecklist | null }) | null> {
    if (!jobId) {
      throw new Error('L\'ID du travail de maintenance est requis');
    }
    return this.repository.findByIdWithEvidenceAndChecklist(jobId);
  }

  /**
   * Ajoute une preuve (photo avant/après) à une intervention
   */
  async addEvidence(data: MaintenanceEvidenceInsert): Promise<MaintenanceEvidence> {
    if (!data.job_id || !data.file_path || !data.created_by) {
      throw new Error('job_id, file_path et created_by sont requis');
    }
    if (data.kind !== 'before' && data.kind !== 'after') {
      throw new Error('kind doit être "before" ou "after"');
    }
    return this.repository.createEvidence(data);
  }

  /**
   * Signe la checklist d'une intervention
   */
  async signChecklist(data: MaintenanceChecklistInsert): Promise<MaintenanceChecklist> {
    if (!data.job_id || !data.signed_by) {
      throw new Error('job_id et signed_by sont requis');
    }
    if (!data.items || typeof data.items !== 'object') {
      throw new Error('items doit être un objet');
    }
    return this.repository.createChecklist(data);
  }

  /**
   * Crée un nouveau travail de maintenance avec validation métier
   */
  async createMaintenanceJob(data: MaintenanceJobInsert): Promise<MaintenanceJob> {
    // Validation métier
    if (!data.vehicle_id) {
      throw new Error('L\'ID du véhicule est requis');
    }

    if (!data.fleet_id) {
      throw new Error('L\'ID de la flotte est requis');
    }

    // Validation de la priorité
    const validPriorities: Priority[] = ['low', 'medium', 'high', 'critical'];
    if (data.priority && !validPriorities.includes(data.priority)) {
      throw new Error('Priorité invalide');
    }

    // Validation du statut
    const validStatuses: JobStatus[] = ['queued', 'in_progress', 'ready', 'blocked'];
    if (data.status && !validStatuses.includes(data.status)) {
      throw new Error('Statut invalide');
    }

    return this.repository.create(data);
  }

  /**
   * Crée un travail de maintenance à partir d'un incident
   */
  async createFromIncident(
    incidentId: string,
    vehicleId: string,
    fleetId: string,
    priority?: Priority
  ): Promise<MaintenanceJob> {
    if (!incidentId) {
      throw new Error('L\'ID de l\'incident est requis');
    }

    if (!vehicleId) {
      throw new Error('L\'ID du véhicule est requis');
    }

    if (!fleetId) {
      throw new Error('L\'ID de la flotte est requis');
    }

    return this.createMaintenanceJob({
      vehicle_id: vehicleId,
      fleet_id: fleetId,
      created_from_incident_id: incidentId,
      priority: priority || 'medium',
      status: 'queued',
    });
  }

  /**
   * Met à jour un travail de maintenance avec validation métier
   */
  async updateMaintenanceJob(id: string, updates: MaintenanceJobUpdate): Promise<MaintenanceJob> {
    if (!id) {
      throw new Error('L\'ID du travail de maintenance est requis');
    }

    // Validation de la priorité si fournie
    if (updates.priority) {
      const validPriorities: Priority[] = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(updates.priority)) {
        throw new Error('Priorité invalide');
      }
    }

    // Validation du statut si fourni
    if (updates.status) {
      const validStatuses: JobStatus[] = ['queued', 'in_progress', 'ready', 'blocked'];
      if (!validStatuses.includes(updates.status)) {
        throw new Error('Statut invalide');
      }
    }

    return this.repository.update(id, updates);
  }

  /**
   * Supprime un travail de maintenance avec validation métier
   */
  async deleteMaintenanceJob(id: string): Promise<void> {
    if (!id) {
      throw new Error('L\'ID du travail de maintenance est requis');
    }

    const job = await this.repository.findById(id);
    if (!job) {
      throw new Error('Travail de maintenance introuvable');
    }

    return this.repository.delete(id);
  }
}
