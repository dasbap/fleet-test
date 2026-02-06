import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/** Niveaux de sévérité alignés sur le schéma (alertes_automatiques.severity) */
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Alert {
  id: string;
  fleet_id: string;
  alert_type: 'missing_closure' | 'recurring_gap' | 'risky_driver' | 'vehicle_blocked';
  driver_user_id: string | null;
  vehicle_id: string | null;
  shift_id: string | null;
  severity: AlertSeverity;
  message: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function useAlerts(fleetId?: string) {
  const { userFleetId } = useAuth();
  const targetFleetId = fleetId || userFleetId;

  return useQuery({
    queryKey: ['alerts', targetFleetId],
    queryFn: async () => {
      if (!targetFleetId) return [];

      const { data, error } = await supabase
        .from('alertes_automatiques')
        .select('*')
        .eq('fleet_id', targetFleetId)
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Alert[];
    },
    enabled: !!targetFleetId,
    refetchInterval: 60000, // Rafraîchir toutes les minutes
  });
}

export function useGenerateAlerts() {
  const queryClient = useQueryClient();
  const { userFleetId } = useAuth();

  return useMutation({
    mutationFn: async (fleetId?: string) => {
      const targetFleetId = fleetId || userFleetId;
      if (!targetFleetId) throw new Error('No fleet ID');

      const { data, error } = await supabase.rpc('generer_alertes_automatiques', {
        p_fleet_id: targetFleetId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, resolvedBy }: { alertId: string; resolvedBy: string }) => {
      const { error } = await supabase
        .from('alertes_automatiques')
        .update({
          resolved: true,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
