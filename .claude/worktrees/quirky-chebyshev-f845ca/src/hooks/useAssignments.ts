import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';
import { AssignmentService } from '@/services/assignment.service';
import { AssignmentRepository } from '@/repositories/assignment.repository';

const assignmentRepository = new AssignmentRepository();
const assignmentService = new AssignmentService(assignmentRepository);

export interface Assignment {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  driver_user_id: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  vehicle?: {
    id: string;
    registration: string;
    brand: string | null;
    model: string | null;
  } | null;
  driver?: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface Driver {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
}

export function useFleetDrivers(fleetId?: string) {
  return useQuery({
    queryKey: ['fleet-drivers', fleetId],
    queryFn: () => (fleetId ? assignmentService.getFleetDrivers(fleetId) : []),
    enabled: !!fleetId,
  });
}

export function useActiveAssignments(fleetId?: string) {
  return useQuery({
    queryKey: ['active-assignments', fleetId],
    queryFn: () => assignmentService.getActiveAssignments(fleetId),
    enabled: !!fleetId,
  });
}

export function useDriverAssignmentHistory(driverUserId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['driver-history', driverUserId],
    queryFn: () =>
      driverUserId ? assignmentService.getDriverAssignmentHistory(driverUserId) : [],
    enabled: !!driverUserId && enabled,
  });
}

export function useAssignVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      fleet_id: string;
      vehicle_id: string;
      driver_user_id: string;
      starts_at?: string;
    }) => assignmentService.assignVehicle(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['active-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-drivers'] });
      toast({
        title: 'Affectation réussie',
        description: 'Le véhicule a été affecté au chauffeur.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur d'affectation",
        description: mapSupabaseErrorToFrench(error.message),
        variant: 'destructive',
      });
    },
  });
}

export function useEndAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) => assignmentService.endAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['active-assignments'] });
      toast({
        title: 'Affectation terminée',
        description: "L'affectation a été clôturée.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: mapSupabaseErrorToFrench(error.message),
        variant: 'destructive',
      });
    },
  });
}
