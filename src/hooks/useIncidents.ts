import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'validated' | 'in_progress' | 'resolved' | 'rejected';

export interface Incident {
  id: string;
  vehicle_id: string;
  fleet_id: string;
  reported_by: string | null;
  validated_by: string | null;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: string | null;
  photo_urls: string[] | null;
  validation_notes: string | null;
  reported_at: string;
  validated_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  vehicle?: {
    id: string;
    plate_number: string;
    brand: string | null;
    model: string | null;
  } | null;
  reporter?: {
    id: string;
    full_name: string | null;
  } | null;
  validator?: {
    id: string;
    full_name: string | null;
  } | null;
}

export interface IncidentInsert {
  vehicle_id: string;
  fleet_id: string;
  title: string;
  description?: string;
  severity?: IncidentSeverity;
  location?: string;
  photo_urls?: string[];
}

export function useIncidents(fleetId?: string) {
  return useQuery({
    queryKey: ['incidents', fleetId],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select(`
          *,
          vehicle:vehicles(id, plate_number, brand, model),
          reporter:reported_by(id, full_name),
          validator:validated_by(id, full_name)
        `)
        .order('reported_at', { ascending: false });

      if (fleetId) {
        query = query.eq('fleet_id', fleetId);
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
      
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          vehicle_id: incident.vehicle_id,
          fleet_id: incident.fleet_id,
          reported_by: userData.user?.id,
          title: incident.title,
          description: incident.description,
          severity: incident.severity || 'medium',
          location: incident.location,
          photo_urls: incident.photo_urls,
          status: 'reported',
          reported_at: new Date().toISOString(),
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

export function useValidateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      validation_notes 
    }: { 
      id: string; 
      status: 'validated' | 'rejected' | 'in_progress' | 'resolved';
      validation_notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const updateData: Record<string, any> = {
        status,
        validated_by: userData.user?.id,
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (validation_notes) {
        updateData.validation_notes = validation_notes;
      }

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Incident;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      
      const statusMessages: Record<string, string> = {
        validated: 'L\'incident a été validé.',
        rejected: 'L\'incident a été rejeté.',
        in_progress: 'L\'incident est en cours de traitement.',
        resolved: 'L\'incident a été résolu.',
      };

      toast({
        title: 'Incident mis à jour',
        description: statusMessages[data.status] || 'Le statut a été mis à jour.',
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
