import { supabase } from '@/integrations/supabase/client';

export type JobStatus = 'queued' | 'in_progress' | 'ready' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface MaintenanceJobPart {
  designation: string;
  quantity: number;
}

export interface MaintenanceJob {
  id: string;
  vehicle_id: string;
  fleet_id: string;
  created_from_incident_id: string | null;
  priority: Priority;
  status: JobStatus;
  created_at: string;
  closed_at: string | null;
  notes?: string | null;
  planned_at?: string | null;
  parts?: MaintenanceJobPart[];
  // Joined data
  vehicle?: {
    id: string;
    registration: string;
    brand: string | null;
    model: string | null;
  } | null;
  incident?: {
    id: string;
    description: string;
    severity: string;
  } | null;
  evidence_count?: number;
}

export interface MaintenanceJobInsert {
  vehicle_id: string;
  fleet_id: string;
  created_from_incident_id?: string | null;
  priority?: Priority;
  status?: JobStatus;
  notes?: string | null;
  planned_at?: string | null;
  parts?: MaintenanceJobPart[];
}

export interface MaintenanceJobUpdate {
  priority?: Priority;
  status?: JobStatus;
  notes?: string | null;
  planned_at?: string | null;
  closed_at?: string | null;
  parts?: MaintenanceJobPart[];
}

export interface MaintenanceJobFilters {
  fleet_id?: string;
  vehicle_id?: string;
  status?: JobStatus;
}

/**
 * Repository pour l'accès aux données des travaux de maintenance
 */
export class MaintenanceRepository {
  /**
   * Récupère tous les travaux de maintenance avec filtres
   */
  async findAll(filters?: MaintenanceJobFilters): Promise<MaintenanceJob[]> {
    let query = supabase
      .from('travaux_maintenance')
      .select(`
        *,
        vehicle:vehicules!travaux_maintenance_vehicle_id_fkey(id, registration, brand, model),
        incident:incidents!travaux_maintenance_created_from_incident_id_fkey(id, description, severity)
      `)
      .order('created_at', { ascending: false });

    if (filters?.fleet_id) {
      query = query.eq('fleet_id', filters.fleet_id);
    }

    if (filters?.vehicle_id) {
      query = query.eq('vehicle_id', filters.vehicle_id);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching maintenance jobs:', error);
      throw new Error(error.message);
    }

    return (data || []) as MaintenanceJob[];
  }

  /**
   * Récupère un travail de maintenance par son ID
   */
  async findById(id: string): Promise<MaintenanceJob | null> {
    const { data, error } = await supabase
      .from('travaux_maintenance')
      .select(`
        *,
        vehicle:vehicules!travaux_maintenance_vehicle_id_fkey(id, registration, brand, model),
        incident:incidents!travaux_maintenance_created_from_incident_id_fkey(id, description, severity)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching maintenance job:', error);
      throw new Error(error.message);
    }

    return data as MaintenanceJob;
  }

  /**
   * Crée un nouveau travail de maintenance
   */
  async create(job: MaintenanceJobInsert): Promise<MaintenanceJob> {
    const { data, error } = await supabase
      .from('travaux_maintenance')
      .insert({
        vehicle_id: job.vehicle_id,
        fleet_id: job.fleet_id,
        created_from_incident_id: job.created_from_incident_id || null,
        priority: job.priority || 'medium',
        status: job.status || 'queued',
        notes: job.notes || null,
        planned_at: job.planned_at || null,
        parts: job.parts || null,
      })
      .select(`
        *,
        vehicle:vehicules!travaux_maintenance_vehicle_id_fkey(id, registration, brand, model),
        incident:incidents!travaux_maintenance_created_from_incident_id_fkey(id, description, severity)
      `)
      .single();

    if (error) {
      console.error('Error creating maintenance job:', error);
      throw new Error(error.message);
    }

    return data as MaintenanceJob;
  }

  /**
   * Met à jour un travail de maintenance
   */
  async update(id: string, updates: MaintenanceJobUpdate): Promise<MaintenanceJob> {
    const { data, error } = await supabase
      .from('travaux_maintenance')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        vehicle:vehicules!travaux_maintenance_vehicle_id_fkey(id, registration, brand, model),
        incident:incidents!travaux_maintenance_created_from_incident_id_fkey(id, description, severity)
      `)
      .single();

    if (error) {
      console.error('Error updating maintenance job:', error);
      throw new Error(error.message);
    }

    return data as MaintenanceJob;
  }

  /**
   * Supprime un travail de maintenance
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('travaux_maintenance').delete().eq('id', id);

    if (error) {
      console.error('Error deleting maintenance job:', error);
      throw new Error(error.message);
    }
  }
}
