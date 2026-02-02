import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  description: string;
  severity?: IncidentSeverity;
  evidence_path?: string;
}

export function useIncidents(fleetId?: string) {
  return useQuery({
    queryKey: ['incidents', fleetId],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select(`
          *,
          vehicle:vehicles(id, registration, brand, model, fleet_id),
          driver:profiles!incidents_driver_user_id_fkey(user_id, full_name)
        `)
        .order('created_at', { ascending: false });

      // If fleetId is provided, filter by fleet
      if (fleetId) {
        query = query.eq('vehicle.fleet_id', fleetId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching incidents:', error);
        throw new Error(error.message);
      }

      return (data || []) as Incident[];
    },
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incident: IncidentInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error('Utilisateur non connecté');
      }

      const { data, error } = await supabase
        .from('incidents')
        .insert({
          vehicle_id: incident.vehicle_id,
          driver_user_id: userData.user.id,
          description: incident.description,
          severity: incident.severity || 'medium',
          evidence_path: incident.evidence_path,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({
        title: 'Incident signalé',
        description: 'L\'incident a été enregistré avec succès.',
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

// Hook to create a maintenance job from an incident
export function useCreateMaintenanceFromIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      incident_id, 
      vehicle_id, 
      fleet_id,
      priority 
    }: { 
      incident_id: string;
      vehicle_id: string;
      fleet_id: string;
      priority?: string;
    }) => {
      const { data, error } = await supabase
        .from('maintenance_jobs')
        .insert({
          vehicle_id,
          fleet_id,
          created_from_incident_id: incident_id,
          priority: priority || 'medium',
          status: 'queued',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_jobs'] });
      toast({
        title: 'Intervention créée',
        description: 'L\'incident a été converti en intervention de maintenance.',
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
