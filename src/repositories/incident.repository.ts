import { supabase } from '@/integrations/supabase/client';
import type { IRepository } from './base.repository';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Incident {
  id: string;
  vehicle_id: string;
  driver_user_id: string;
  severity: IncidentSeverity;
  description: string;
  evidence_path: string | null;
  created_at: string;
  // Joined data
  vehicle?: {
    id: string;
    registration: string;
    brand: string | null;
    model: string | null;
    fleet_id: string;
  } | null;
  driver?: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface IncidentInsert {
  vehicle_id: string;
  driver_user_id: string;
  description: string;
  severity?: IncidentSeverity;
  evidence_path?: string | null;
}

export interface IncidentUpdate {
  description?: string;
  severity?: IncidentSeverity;
  evidence_path?: string | null;
}

export interface IncidentFilters {
  fleet_id?: string;
  vehicle_id?: string;
  driver_user_id?: string;
  severity?: IncidentSeverity;
}

/**
 * Repository pour l'accès aux données des incidents
 */
export class IncidentRepository implements IRepository<Incident, IncidentInsert, IncidentUpdate> {
  /**
   * Récupère tous les incidents avec filtres optionnels
   */
  async findAll(filters?: IncidentFilters): Promise<Incident[]> {
    let query = supabase
      .from('incidents')
      .select(`
        *,
        vehicle:vehicules(id, registration, brand, model, fleet_id),
        driver:profils!incidents_driver_user_id_fkey(user_id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.fleet_id) {
      // Filtrer via la relation vehicle
      query = query.eq('vehicle.fleet_id', filters.fleet_id);
    }

    if (filters?.vehicle_id) {
      query = query.eq('vehicle_id', filters.vehicle_id);
    }

    if (filters?.driver_user_id) {
      query = query.eq('driver_user_id', filters.driver_user_id);
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching incidents:', error);
      throw new Error(error.message);
    }

    return (data || []) as Incident[];
  }

  /**
   * Récupère un incident par son ID
   */
  async findById(id: string): Promise<Incident | null> {
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        vehicle:vehicules(id, registration, brand, model, fleet_id),
        driver:profils!incidents_driver_user_id_fkey(user_id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching incident:', error);
      throw new Error(error.message);
    }

    return data as Incident;
  }

  /**
   * Crée un nouvel incident
   */
  async create(incident: IncidentInsert): Promise<Incident> {
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        vehicle_id: incident.vehicle_id,
        driver_user_id: incident.driver_user_id,
        description: incident.description,
        severity: incident.severity || 'medium',
        evidence_path: incident.evidence_path || null,
      })
      .select(`
        *,
        vehicle:vehicules(id, registration, brand, model, fleet_id),
        driver:profils!incidents_driver_user_id_fkey(user_id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error creating incident:', error);
      throw new Error(error.message);
    }

    return data as Incident;
  }

  /**
   * Met à jour un incident
   */
  async update(id: string, updates: IncidentUpdate): Promise<Incident> {
    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        vehicle:vehicules(id, registration, brand, model, fleet_id),
        driver:profils!incidents_driver_user_id_fkey(user_id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error updating incident:', error);
      throw new Error(error.message);
    }

    return data as Incident;
  }

  /**
   * Supprime un incident
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('incidents').delete().eq('id', id);

    if (error) {
      console.error('Error deleting incident:', error);
      throw new Error(error.message);
    }
  }
}
