import { IncidentRepository } from '@/repositories/incident.repository';
import type {
  Incident,
  IncidentInsert,
  IncidentUpdate,
  IncidentFilters,
  IncidentSeverity,
} from '@/repositories/incident.repository';
import { supabase } from '@/integrations/supabase/client';

/**
 * Service pour la logique métier des incidents
 */
export class IncidentService {
  constructor(private repository: IncidentRepository) {}

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
    // Validation métier
    if (!data.vehicle_id) {
      throw new Error('L\'ID du véhicule est requis');
    }

    if (!data.driver_user_id) {
      throw new Error('L\'ID du conducteur est requis');
    }

    if (!data.description || data.description.trim() === '') {
      throw new Error('La description de l\'incident est requise');
    }

    // Validation de la sévérité
    const validSeverities: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (data.severity && !validSeverities.includes(data.severity)) {
      throw new Error('Sévérité invalide');
    }

    return this.repository.create({
      ...data,
      description: data.description.trim(),
      severity: data.severity || 'medium',
    });
  }

  /**
   * Crée un incident pour l'utilisateur connecté
   */
  async createIncidentForCurrentUser(data: Omit<IncidentInsert, 'driver_user_id'>): Promise<Incident> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('Utilisateur non connecté');
    }

    return this.createIncident({
      ...data,
      driver_user_id: userData.user.id,
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
