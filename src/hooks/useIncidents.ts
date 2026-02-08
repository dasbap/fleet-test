import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { IncidentService } from '@/services/incident.service';
import { IncidentRepository } from '@/repositories/incident.repository';
import { MaintenanceService } from '@/services/maintenance.service';
import { MaintenanceRepository } from '@/repositories/maintenance.repository';

// Instances singleton des services et repositories
const incidentRepository = new IncidentRepository();
const incidentService = new IncidentService(incidentRepository);
const maintenanceRepository = new MaintenanceRepository();
const maintenanceService = new MaintenanceService(maintenanceRepository);

// Réexporter les types pour compatibilité
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
    queryFn: () => incidentService.getIncidents(fleetId),
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incident: IncidentInsert) => {
      return incidentService.createIncidentForCurrentUser(incident);
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
      priority,
    }: {
      incident_id: string;
      vehicle_id: string;
      fleet_id: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }) => {
      return maintenanceService.createFromIncident(incident_id, vehicle_id, fleet_id, priority);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] });
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
