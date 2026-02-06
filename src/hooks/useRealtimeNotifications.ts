import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface NotificationPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
}

export function useRealtimeNotifications(fleetId?: string) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!fleetId) return;

    // Create a unique channel for this fleet
    const channel = supabase.channel(`fleet-notifications-${fleetId}`);
    channelRef.current = channel;

    // Listen for new driver shift closures
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'clotures_creneaux',
      },
      async (payload) => {
        const closure = payload.new;
        
        // Fetch the related shift and assignment to check fleet_id
        const { data: shift } = await supabase
          .from('creneaux_conducteurs')
          .select(`
            assignment_id,
            assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
              fleet_id,
              driver_user_id
            )
          `)
          .eq('id', closure.shift_id)
          .single();

        if (shift?.assignment?.fleet_id === fleetId) {
          // Get driver profile
          const { data: profile } = await supabase
            .from('profils')
            .select('full_name')
            .eq('user_id', shift.assignment.driver_user_id)
            .single();

          toast({
            title: '🔔 Nouvelle clôture de créneau',
            description: `${profile?.full_name || 'Un chauffeur'} a terminé son créneau avec ${closure.revenue_declared} FCFA de revenus.`,
          });

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
        }
      }
    );

    // Listen for new incidents
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'incidents',
      },
      async (payload) => {
        const incident = payload.new;

        // Get vehicle info to check fleet_id
        const { data: vehicle } = await supabase
          .from('vehicules')
          .select('registration, fleet_id')
          .eq('id', incident.vehicle_id)
          .single();

        if (vehicle?.fleet_id === fleetId) {

          const severityLabels: Record<string, string> = {
            low: 'faible',
            medium: 'moyenne',
            high: 'haute',
            critical: 'critique',
          };

          toast({
            title: `⚠️ Nouvel incident (${severityLabels[incident.severity] || incident.severity})`,
            description: `Véhicule ${vehicle?.registration || 'inconnu'}: ${incident.description?.slice(0, 50)}...`,
            variant: incident.severity === 'critical' ? 'destructive' : 'default',
          });

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['incidents'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
        }
      }
    );

    // Listen for new maintenance jobs
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'travaux_maintenance',
      },
      async (payload) => {
        const job = payload.new;

        if (job.fleet_id === fleetId) {
          // Get vehicle info
          const { data: vehicle } = await supabase
            .from('vehicules')
            .select('registration')
            .eq('id', job.vehicle_id)
            .single();

          const priorityLabels: Record<string, string> = {
            low: 'basse',
            medium: 'moyenne',
            high: 'haute',
            critical: 'critique',
          };

          toast({
            title: '🔧 Nouvelle intervention de maintenance',
            description: `Véhicule ${vehicle?.registration || 'inconnu'} - Priorité ${priorityLabels[job.priority] || job.priority}`,
          });

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      }
    );

    // Listen for maintenance job status updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'travaux_maintenance',
      },
      async (payload) => {
        const job = payload.new;
        const oldJob = payload.old;

        if (job.fleet_id === fleetId && job.status !== oldJob.status) {
          // Get vehicle info
          const { data: vehicle } = await supabase
            .from('vehicules')
            .select('registration')
            .eq('id', job.vehicle_id)
            .single();

          const statusLabels: Record<string, string> = {
            queued: 'en attente',
            in_progress: 'en cours',
            ready: 'terminée ✅',
            blocked: 'bloquée ⛔',
          };

          toast({
            title: '🔧 Statut maintenance mis à jour',
            description: `${vehicle?.registration || 'Véhicule'}: ${statusLabels[job.status] || job.status}`,
          });

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['maintenance-job', job.id] });
        }
      }
    );

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time notifications active for fleet:', fleetId);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Real-time subscription error');
      }
    });

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fleetId, queryClient]);
}
