import { supabase } from '@/integrations/supabase/client';
import type { IRepository } from './base.repository';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Incident {
  id: string;
  vehicle_id: string;
  driver_user_id: string;
  severity: IncidentSeverity;
  description: string;
  incident_category: string | null;
  evidence_path: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolved_at: string | null;
  resolved_by: string | null;
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
  incident_category?: string | null;
  evidence_path?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  client_idempotency_key?: string | null;
}

export interface IncidentUpdate {
  description?: string;
  severity?: IncidentSeverity;
  incident_category?: string | null;
  evidence_path?: string | null;
  status?: 'open' | 'investigating' | 'resolved' | 'closed';
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface IncidentFilters {
  fleet_id?: string;
  vehicle_id?: string;
  driver_user_id?: string;
  severity?: IncidentSeverity;
  /** Filtre incidents créés à partir de cette date (ISO) */
  created_at_since?: string;
  /** Limite de lignes (pagination légère) */
  limit?: number;
}

type IncidentDriverProfile = Pick<NonNullable<Incident['driver']>, 'user_id' | 'full_name'>;
type IncidentInsertPayload = {
  vehicle_id: string;
  driver_user_id: string;
  description: string;
  severity: IncidentSeverity;
  incident_category?: string | null;
  evidence_path: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'open';
  resolved_at: null;
  resolved_by: null;
  client_idempotency_key?: string;
};

const OPTIONAL_INCIDENT_INSERT_COLUMNS = new Set([
  'incident_category',
  'client_idempotency_key',
]);

function getMissingSchemaColumn(error: { code?: string; message?: string } | null): string | null {
  if (error?.code !== 'PGRST204') return null;
  const match = error.message?.match(/'([^']+)' column of 'incidents'/);
  return match?.[1] ?? null;
}

/**
 * Repository pour l'accès aux données des incidents
 */
export class IncidentRepository implements IRepository<Incident, IncidentInsert, IncidentUpdate> {
  private async hydrateDrivers(rows: Incident[]): Promise<Incident[]> {
    if (rows.length === 0) return rows;

    const driverIds = [...new Set(rows.map((row) => row.driver_user_id).filter(Boolean))];
    if (driverIds.length === 0) {
      return rows.map((row) => ({ ...row, driver: null }));
    }

    const { data: profiles, error } = await supabase
      .from('profils')
      .select('user_id, full_name')
      .in('user_id', driverIds);

    if (error) {
      console.error('Error fetching incident driver profiles:', error);
      throw new Error(error.message);
    }

    const profileByUserId = new Map(
      ((profiles ?? []) as IncidentDriverProfile[]).map((profile) => [profile.user_id, profile]),
    );

    return rows.map((row) => ({
      ...row,
      driver: profileByUserId.get(row.driver_user_id) ?? null,
    }));
  }

  private async hydrateDriver(row: Incident | null): Promise<Incident | null> {
    if (!row) return null;
    const [hydrated] = await this.hydrateDrivers([row]);
    return hydrated;
  }

  /**
   * Récupère tous les incidents avec filtres optionnels
   */
  async findAll(filters?: IncidentFilters): Promise<Incident[]> {
    const vehicleSelect = filters?.fleet_id
      ? 'vehicle:vehicules!inner(id, registration, brand, model, fleet_id)'
      : 'vehicle:vehicules(id, registration, brand, model, fleet_id)';

    let query = supabase
      .from('incidents')
      .select(`
        *,
        ${vehicleSelect}
      `)
      .order('created_at', { ascending: false });

    if (filters?.fleet_id) {
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

    if (filters?.created_at_since) {
      query = query.gte('created_at', filters.created_at_since);
    }

    if (filters?.limit != null && filters.limit > 0) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching incidents:', error);
      throw new Error(error.message);
    }

    return this.hydrateDrivers((data || []) as Incident[]);
  }

  /**
   * Récupère un incident par son ID
   */
  async findById(id: string): Promise<Incident | null> {
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        vehicle:vehicules(id, registration, brand, model, fleet_id)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching incident:', error);
      throw new Error(error.message);
    }

    return this.hydrateDriver((data ?? null) as Incident | null);
  }

  /**
   * Crée un nouvel incident
   */
  async create(incident: IncidentInsert): Promise<Incident> {
    const insertPayload: IncidentInsertPayload = {
      vehicle_id: incident.vehicle_id,
      driver_user_id: incident.driver_user_id,
      description: incident.description,
      severity: incident.severity || 'medium',
      incident_category: incident.incident_category ?? null,
      evidence_path: incident.evidence_path || null,
      latitude:
        incident.latitude !== undefined && incident.latitude !== null
          ? incident.latitude
          : null,
      longitude:
        incident.longitude !== undefined && incident.longitude !== null
          ? incident.longitude
          : null,
      status: 'open',
      resolved_at: null,
      resolved_by: null,
      ...(incident.client_idempotency_key
        ? { client_idempotency_key: incident.client_idempotency_key }
        : {}),
    };

    const insertIncident = (payload: IncidentInsertPayload) =>
      supabase
        .from('incidents')
        .insert(payload)
        .select(`
          *,
          vehicle:vehicules(id, registration, brand, model, fleet_id)
        `)
        .single();

    const fallbackPayload = { ...insertPayload };
    let { data, error } = await insertIncident(fallbackPayload);

    for (let attempt = 0; attempt < OPTIONAL_INCIDENT_INSERT_COLUMNS.size; attempt += 1) {
      const missingColumn = getMissingSchemaColumn(error);
      if (!missingColumn || !OPTIONAL_INCIDENT_INSERT_COLUMNS.has(missingColumn)) break;

      delete fallbackPayload[missingColumn as keyof IncidentInsertPayload];
      ({ data, error } = await insertIncident(fallbackPayload));
    }

    if (error) {
      console.error('Error creating incident:', error);
      throw new Error(error.message);
    }

    const hydrated = await this.hydrateDriver(data as Incident);
    return hydrated as Incident;
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
        vehicle:vehicules(id, registration, brand, model, fleet_id)
      `)
      .maybeSingle();

    if (error) {
      console.error('Error updating incident:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Incident introuvable ou accès refusé');
    }

    const hydrated = await this.hydrateDriver(data as Incident);
    return hydrated as Incident;
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
