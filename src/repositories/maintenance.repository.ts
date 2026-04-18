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
  /** Interventions créées à partir de cette date (ISO), ex. début de journée */
  created_at_since?: string;
  limit?: number;
}

/**
 * Fenêtre d’agrégation pour tableaux de bord (et vues ops) : retards puis à venir.
 * Permet d’ajuster les plafonds sans changer les appelants ; une vue SQL peut remplacer
 * l’implémentation si les volumes le justifient (mesurer p95 / taille des tables).
 */
export interface DashboardMaintenanceWindowOptions {
  /** Nombre max de lignes après fusion retards + à venir (défaut 15). */
  totalLimit?: number;
  /**
   * Plafond par requête (branche retards, branche à venir). Défaut = totalLimit.
   * Utile si une branche monopolise la fenêtre.
   */
  branchLimit?: number;
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

    if (filters?.created_at_since) {
      query = query.gte('created_at', filters.created_at_since);
    }

    if (filters?.limit != null && filters.limit > 0) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching maintenance jobs:', error);
      throw new Error(error.message);
    }

    return (data || []) as MaintenanceJob[];
  }

  /**
   * Interventions planifiées pour widgets dashboard / ops : retards puis à venir, même logique
   * que {@link findDashboardMaintenanceWindow}. Alias historique pour compatibilité.
   */
  async findScheduledForFleet(fleetId: string, limit: number = 15): Promise<MaintenanceJob[]> {
    return this.findDashboardMaintenanceWindow(fleetId, { totalLimit: limit });
  }

  /**
   * Fenêtre « retards + à venir » pour une flotte : `planned_at` renseigné, statuts ouverts uniquement.
   * Implémentation actuelle : deux requêtes puis fusion (remplaçable plus tard par une vue SQL matérialisée).
   */
  async findDashboardMaintenanceWindow(
    fleetId: string,
    options: DashboardMaintenanceWindowOptions = {},
  ): Promise<MaintenanceJob[]> {
    const totalLimit = options.totalLimit ?? 15;
    const branchLimit = options.branchLimit ?? totalLimit;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startIso = startOfToday.toISOString();

    const selectClause = `
        *,
        vehicle:vehicules!travaux_maintenance_vehicle_id_fkey(id, registration, brand, model),
        incident:incidents!travaux_maintenance_created_from_incident_id_fkey(id, description, severity)
      `;

    const openStatuses = ['queued', 'in_progress', 'blocked'] as const;

    const [overdueRes, upcomingRes] = await Promise.all([
      supabase
        .from('travaux_maintenance')
        .select(selectClause)
        .eq('fleet_id', fleetId)
        .not('planned_at', 'is', null)
        .lt('planned_at', startIso)
        .in('status', [...openStatuses])
        .order('planned_at', { ascending: true })
        .limit(branchLimit),
      supabase
        .from('travaux_maintenance')
        .select(selectClause)
        .eq('fleet_id', fleetId)
        .not('planned_at', 'is', null)
        .gte('planned_at', startIso)
        .in('status', [...openStatuses])
        .order('planned_at', { ascending: true })
        .limit(branchLimit),
    ]);

    if (overdueRes.error) {
      console.error('Error fetching overdue scheduled maintenance:', overdueRes.error);
      throw new Error(overdueRes.error.message);
    }
    if (upcomingRes.error) {
      console.error('Error fetching upcoming scheduled maintenance:', upcomingRes.error);
      throw new Error(upcomingRes.error.message);
    }

    const overdue = (overdueRes.data || []) as MaintenanceJob[];
    const upcoming = (upcomingRes.data || []) as MaintenanceJob[];

    const seen = new Set<string>();
    const merged: MaintenanceJob[] = [];
    for (const job of overdue) {
      if (!seen.has(job.id)) {
        seen.add(job.id);
        merged.push(job);
      }
    }
    for (const job of upcoming) {
      if (!seen.has(job.id)) {
        seen.add(job.id);
        merged.push(job);
      }
    }

    return merged.slice(0, totalLimit);
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

  /**
   * Récupère un travail avec preuves et checklist
   */
  async findByIdWithEvidenceAndChecklist(
    jobId: string
  ): Promise<(MaintenanceJob & { evidence: MaintenanceEvidence[]; checklist: MaintenanceChecklist | null }) | null> {
    const job = await this.findById(jobId);
    if (!job) return null;

    const { data: evidence } = await supabase
      .from('preuves_maintenance')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    const { data: checklist } = await supabase
      .from('listes_verification_maintenance')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    return {
      ...job,
      evidence: (evidence || []) as MaintenanceEvidence[],
      checklist: (checklist as MaintenanceChecklist) || null,
    };
  }

  /**
   * Ajoute une preuve (photo avant/après) à une intervention
   */
  async createEvidence(data: MaintenanceEvidenceInsert): Promise<MaintenanceEvidence> {
    const { data: row, error } = await supabase
      .from('preuves_maintenance')
      .insert({
        job_id: data.job_id,
        kind: data.kind,
        file_path: data.file_path,
        created_by: data.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating maintenance evidence:', error);
      throw new Error(error.message);
    }
    return row as MaintenanceEvidence;
  }

  /**
   * Crée ou enregistre une checklist signée pour une intervention
   */
  async createChecklist(data: MaintenanceChecklistInsert): Promise<MaintenanceChecklist> {
    const { data: row, error } = await supabase
      .from('listes_verification_maintenance')
      .insert({
        job_id: data.job_id,
        items: data.items,
        signed_by: data.signed_by,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating maintenance checklist:', error);
      throw new Error(error.message);
    }
    return row as MaintenanceChecklist;
  }
}

export interface MaintenanceEvidence {
  id: string;
  job_id: string;
  kind: 'before' | 'after';
  file_path: string;
  created_by: string;
  created_at: string;
}

export interface MaintenanceChecklist {
  id: string;
  job_id: string;
  items: Record<string, boolean>;
  signed_by: string;
  signed_at: string;
}

export interface MaintenanceEvidenceInsert {
  job_id: string;
  kind: 'before' | 'after';
  file_path: string;
  created_by: string;
}

export interface MaintenanceChecklistInsert {
  job_id: string;
  items: Record<string, boolean>;
  signed_by: string;
}
