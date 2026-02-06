import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DashboardStats {
  activeVehicles: number;
  totalVehicles: number;
  blockedVehicles: number;
  activeDrivers: number;
  totalDrivers: number;
  pendingIncidents: number;
  todayRevenue: number;
  pendingClosures: number;
  maintenanceInProgress: number;
}

export function useDashboardStats() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', userFleetId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!userFleetId) {
        return {
          activeVehicles: 0,
          totalVehicles: 0,
          blockedVehicles: 0,
          activeDrivers: 0,
          totalDrivers: 0,
          pendingIncidents: 0,
          todayRevenue: 0,
          pendingClosures: 0,
          maintenanceInProgress: 0,
        };
      }

      // Fetch all stats in parallel
      const [
        vehiclesResult,
        driversResult,
        incidentsResult,
        closuresResult,
        maintenanceResult,
        assignmentsResult,
      ] = await Promise.all([
        // Vehicles stats
        supabase
          .from('vehicules')
          .select('id, status')
          .eq('fleet_id', userFleetId),
        
        // Drivers in fleet
        supabase
          .from('flotte_adhesions')
          .select('user_id')
          .eq('fleet_id', userFleetId)
          .eq('role', 'driver')
          .eq('is_active', true),
        
        // Incidents (last 30 days)
        supabase
          .from('incidents')
          .select('id, vehicle_id')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Pending closures
        supabase
          .from('clotures_creneaux')
          .select('id, revenue_declared, status')
          .eq('status', 'pending'),
        
        // Maintenance in progress
        supabase
          .from('travaux_maintenance')
          .select('id, status')
          .eq('fleet_id', userFleetId)
          .eq('status', 'in_progress'),
        
        // Active assignments (drivers currently working)
        supabase
          .from('affectations_vehicules')
          .select('id')
          .eq('fleet_id', userFleetId)
          .eq('is_active', true),
      ]);

      const vehicles = vehiclesResult.data || [];
      const drivers = driversResult.data || [];
      const incidents = incidentsResult.data || [];
      const closures = closuresResult.data || [];
      const maintenance = maintenanceResult.data || [];
      const activeAssignments = assignmentsResult.data || [];

      // Calculate today's revenue from validated closures
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayClosures } = await supabase
        .from('clotures_creneaux')
        .select('revenue_declared, status')
        .gte('created_at', today.toISOString())
        .eq('status', 'validated');

      const todayRevenue = (todayClosures || []).reduce(
        (sum, c) => sum + (c.revenue_declared || 0),
        0
      );

      return {
        activeVehicles: vehicles.filter(v => v.status === 'ok').length,
        totalVehicles: vehicles.length,
        blockedVehicles: vehicles.filter(v => v.status === 'blocked').length,
        activeDrivers: activeAssignments.length,
        totalDrivers: drivers.length,
        pendingIncidents: incidents.length,
        todayRevenue,
        pendingClosures: closures.length,
        maintenanceInProgress: maintenance.length,
      };
    },
    enabled: !!userFleetId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
  });
}

export function useRecentActivity() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['recent-activity', userFleetId],
    queryFn: async () => {
      if (!userFleetId) return [];

      // Fetch recent events from multiple sources
      const [closures, incidents, maintenance] = await Promise.all([
        supabase
          .from('clotures_creneaux')
          .select(`
            id, 
            revenue_declared, 
            status, 
            created_at,
            shift:creneaux_conducteurs(
              id,
              assignment:affectations_vehicules(
                vehicle:vehicules(registration)
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('incidents')
          .select('id, description, severity, created_at, vehicle:vehicules(registration)')
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('travaux_maintenance')
          .select('id, status, priority, created_at, vehicle:vehicules(registration)')
          .eq('fleet_id', userFleetId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Combine and sort all activities
      const activities: Array<{
        id: string;
        type: 'closure' | 'incident' | 'maintenance';
        message: string;
        detail: string;
        time: Date;
        status?: string;
      }> = [];

      (closures.data || []).forEach(c => {
        const vehicle = (c.shift as any)?.assignment?.vehicle?.registration || 'Véhicule';
        activities.push({
          id: `closure-${c.id}`,
          type: 'closure',
          message: c.status === 'validated' ? 'Clôture validée' : 
                   c.status === 'rejected' ? 'Clôture rejetée' : 'Clôture en attente',
          detail: `${vehicle} - ${(c.revenue_declared || 0).toLocaleString()} FCFA`,
          time: new Date(c.created_at),
          status: c.status,
        });
      });

      (incidents.data || []).forEach(i => {
        activities.push({
          id: `incident-${i.id}`,
          type: 'incident',
          message: `Incident ${i.severity}`,
          detail: `${(i.vehicle as any)?.registration || 'Véhicule'} - ${i.description?.substring(0, 30)}...`,
          time: new Date(i.created_at),
        });
      });

      (maintenance.data || []).forEach(m => {
        activities.push({
          id: `maintenance-${m.id}`,
          type: 'maintenance',
          message: m.status === 'ready' ? 'Intervention terminée' : 
                   m.status === 'in_progress' ? 'Intervention en cours' : 'Intervention en file',
          detail: `${(m.vehicle as any)?.registration || 'Véhicule'} - Priorité ${m.priority}`,
          time: new Date(m.created_at),
          status: m.status,
        });
      });

      // Sort by time descending
      return activities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);
    },
    enabled: !!userFleetId,
    refetchInterval: 30000,
  });
}

export function useFleetVehicles() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['fleet-vehicles-overview', userFleetId],
    queryFn: async () => {
      if (!userFleetId) return [];

      const { data, error } = await supabase
        .from('vehicules')
        .select(`
          id,
          registration,
          brand,
          model,
          current_km,
          status,
          blocked_reason,
          assignments:affectations_vehicules(
            id,
            is_active,
            driver_user_id
          )
        `)
        .eq('fleet_id', userFleetId)
        .order('registration', { ascending: true })
        .limit(10);

      if (error) throw error;

      return (data || []).map(v => {
        const activeAssignment = (v.assignments as any[])?.find(a => a.is_active);
        return {
          id: v.id,
          registration: v.registration,
          brand: v.brand,
          model: v.model,
          current_km: v.current_km,
          status: v.status,
          blocked_reason: v.blocked_reason,
          driver: activeAssignment ? 'Conducteur' : null,
          hasActiveAssignment: !!activeAssignment,
        };
      });
    },
    enabled: !!userFleetId,
  });
}
