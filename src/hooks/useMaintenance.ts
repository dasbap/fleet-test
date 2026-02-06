import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export type JobStatus = 'queued' | 'in_progress' | 'ready' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

/** Élément de pièce / consommable pour une intervention */
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

// Fetch maintenance jobs
export function useMaintenanceJobs(fleetId?: string, status?: JobStatus) {
  return useQuery({
    queryKey: ['maintenance-jobs', fleetId, status],
    queryFn: async () => {
      let query = supabase
        .from('travaux_maintenance')
        .select(`
          *,
          vehicle:vehicules!travaux_maintenance_vehicle_id_fkey(id, registration, brand, model),
          incident:incidents!travaux_maintenance_created_from_incident_id_fkey(id, description, severity)
        `)
        .order('created_at', { ascending: false });

      if (fleetId) {
        query = query.eq('fleet_id', fleetId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching maintenance jobs:', error);
        throw new Error(error.message);
      }

      return data as MaintenanceJob[];
    },
  });
}

// Fetch a single job with evidence
export function useMaintenanceJob(jobId?: string) {
  return useQuery({
    queryKey: ['maintenance-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const { data: job, error } = await supabase
        .from('travaux_maintenance')
        .select(`
          *,
          vehicle:vehicules!travaux_maintenance_vehicle_id_fkey(id, registration, brand, model),
          incident:incidents!travaux_maintenance_created_from_incident_id_fkey(id, description, severity)
        `)
        .eq('id', jobId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Get evidence
      const { data: evidence } = await supabase
        .from('preuves_maintenance')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      // Get checklist
      const { data: checklist } = await supabase
        .from('listes_verification_maintenance')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      return {
        ...job,
        evidence: evidence || [],
        checklist: checklist || null,
      };
    },
    enabled: !!jobId,
  });
}

// Create maintenance job
export function useCreateMaintenanceJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vehicle_id,
      fleet_id,
      priority = 'medium',
      created_from_incident_id,
    }: {
      vehicle_id: string;
      fleet_id: string;
      priority?: Priority;
      created_from_incident_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('travaux_maintenance')
        .insert({
          vehicle_id,
          fleet_id,
          priority,
          created_from_incident_id: created_from_incident_id || null,
          status: 'queued',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as MaintenanceJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] });
      toast({
        title: 'Intervention créée',
        description: 'L\'intervention a été ajoutée à la file d\'attente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update job status
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: JobStatus;
    }) => {
      const updates: any = { status };
      
      if (status === 'ready') {
        updates.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('travaux_maintenance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as MaintenanceJob;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-job', data.id] });
      
      const statusLabels: Record<JobStatus, string> = {
        queued: 'en attente',
        in_progress: 'en cours',
        ready: 'terminée',
        blocked: 'bloquée',
      };
      
      toast({
        title: 'Statut mis à jour',
        description: `L'intervention est maintenant ${statusLabels[data.status as JobStatus]}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/** Payload partiel pour mise à jour d'une intervention (notes, date prévue, pièces) */
export interface MaintenanceJobUpdatePayload {
  notes?: string | null;
  planned_at?: string | null;
  parts?: MaintenanceJobPart[];
}

// Mise à jour partielle d'une intervention (notes, planned_at, parts)
export function useUpdateMaintenanceJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & MaintenanceJobUpdatePayload) => {
      const { data, error } = await supabase
        .from('travaux_maintenance')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as MaintenanceJob;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-job', data.id] });
      toast({
        title: 'Intervention mise à jour',
        description: 'Les informations ont été enregistrées.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Add evidence
export function useAddEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      job_id,
      kind,
      file_path,
      created_by,
    }: {
      job_id: string;
      kind: 'before' | 'after';
      file_path: string;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from('preuves_maintenance')
        .insert({
          job_id,
          kind,
          file_path,
          created_by,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as MaintenanceEvidence;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-job', data.job_id] });
      toast({
        title: 'Photo ajoutée',
        description: `La photo ${data.kind === 'before' ? 'avant' : 'après'} a été enregistrée.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Sign checklist
export function useSignChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      job_id,
      items,
      signed_by,
    }: {
      job_id: string;
      items: Record<string, boolean>;
      signed_by: string;
    }) => {
      const { data, error } = await supabase
        .from('listes_verification_maintenance')
        .insert({
          job_id,
          items,
          signed_by,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as MaintenanceChecklist;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-job', data.job_id] });
      toast({
        title: 'Checklist signée',
        description: 'L\'intervention a été validée.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
