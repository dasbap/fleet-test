import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FleetReportData {
  period: {
    start: Date;
    end: Date;
  };
  fleet: {
    name: string;
    totalVehicles: number;
    activeVehicles: number;
    blockedVehicles: number;
  };
  revenue: {
    total: number;
    validated: number;
    pending: number;
    byVehicle: Array<{
      registration: string;
      amount: number;
    }>;
  };
  kilometers: {
    total: number;
    average: number;
    byVehicle: Array<{
      registration: string;
      km: number;
    }>;
  };
  incidents: {
    total: number;
    bySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    recent: Array<{
      date: Date;
      vehicle: string;
      description: string;
      severity: string;
    }>;
  };
  maintenance: {
    completed: number;
    inProgress: number;
    pending: number;
  };
  drivers: {
    total: number;
    active: number;
    topPerformers: Array<{
      name: string;
      revenue: number;
      shifts: number;
    }>;
  };
}

export function useFleetReport(startDate: Date, endDate: Date) {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ['fleet-report', userFleetId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<FleetReportData> => {
      if (!userFleetId) {
        throw new Error('No fleet ID available');
      }

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Fetch all data in parallel
      const [
        fleetResult,
        vehiclesResult,
        closuresResult,
        incidentsResult,
        maintenanceResult,
        membersResult,
      ] = await Promise.all([
        // Fleet info
        supabase
          .from('fleets')
          .select('name')
          .eq('id', userFleetId)
          .single(),
        
        // Vehicles
        supabase
          .from('vehicles')
          .select('id, registration, status, current_km')
          .eq('fleet_id', userFleetId),
        
        // Shift closures in period
        supabase
          .from('driver_shift_closures')
          .select(`
            id, 
            revenue_declared, 
            status, 
            created_at,
            shift:driver_shifts(
              id,
              km_start,
              km_end,
              assignment:driver_vehicle_assignments(
                vehicle:vehicles(registration),
                driver:profiles(full_name)
              )
            )
          `)
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        
        // Incidents in period
        supabase
          .from('incidents')
          .select('id, description, severity, created_at, vehicle:vehicles(registration)')
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        
        // Maintenance jobs
        supabase
          .from('maintenance_jobs')
          .select('id, status, created_at')
          .eq('fleet_id', userFleetId)
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        
        // Fleet members
        supabase
          .from('fleet_memberships')
          .select('user_id, role, is_active')
          .eq('fleet_id', userFleetId)
          .eq('role', 'driver'),
      ]);

      const fleet = fleetResult.data;
      const vehicles = vehiclesResult.data || [];
      const closures = closuresResult.data || [];
      const incidents = incidentsResult.data || [];
      const maintenance = maintenanceResult.data || [];
      const members = membersResult.data || [];

      // Calculate revenue stats
      const validatedClosures = closures.filter(c => c.status === 'validated');
      const pendingClosures = closures.filter(c => c.status === 'pending');
      const totalRevenue = closures.reduce((sum, c) => sum + (c.revenue_declared || 0), 0);
      const validatedRevenue = validatedClosures.reduce((sum, c) => sum + (c.revenue_declared || 0), 0);
      const pendingRevenue = pendingClosures.reduce((sum, c) => sum + (c.revenue_declared || 0), 0);

      // Revenue by vehicle
      const revenueByVehicle: Record<string, number> = {};
      closures.forEach(c => {
        const reg = (c.shift as any)?.assignment?.vehicle?.registration;
        if (reg) {
          revenueByVehicle[reg] = (revenueByVehicle[reg] || 0) + (c.revenue_declared || 0);
        }
      });

      // Calculate KM stats
      let totalKm = 0;
      const kmByVehicle: Record<string, number> = {};
      closures.forEach(c => {
        const shift = c.shift as any;
        if (shift?.km_start != null && shift?.km_end != null) {
          const km = shift.km_end - shift.km_start;
          totalKm += km;
          const reg = shift.assignment?.vehicle?.registration;
          if (reg) {
            kmByVehicle[reg] = (kmByVehicle[reg] || 0) + km;
          }
        }
      });

      // Incidents by severity
      const incidentsBySeverity = {
        low: incidents.filter(i => i.severity === 'low').length,
        medium: incidents.filter(i => i.severity === 'medium').length,
        high: incidents.filter(i => i.severity === 'high').length,
        critical: incidents.filter(i => i.severity === 'critical').length,
      };

      // Top performers
      const driverStats: Record<string, { name: string; revenue: number; shifts: number }> = {};
      closures.forEach(c => {
        const driverName = (c.shift as any)?.assignment?.driver?.full_name;
        if (driverName) {
          if (!driverStats[driverName]) {
            driverStats[driverName] = { name: driverName, revenue: 0, shifts: 0 };
          }
          driverStats[driverName].revenue += c.revenue_declared || 0;
          driverStats[driverName].shifts += 1;
        }
      });

      return {
        period: {
          start: startDate,
          end: endDate,
        },
        fleet: {
          name: fleet?.name || 'Ma Flotte',
          totalVehicles: vehicles.length,
          activeVehicles: vehicles.filter(v => v.status === 'ok').length,
          blockedVehicles: vehicles.filter(v => v.status === 'blocked').length,
        },
        revenue: {
          total: totalRevenue,
          validated: validatedRevenue,
          pending: pendingRevenue,
          byVehicle: Object.entries(revenueByVehicle)
            .map(([registration, amount]) => ({ registration, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10),
        },
        kilometers: {
          total: totalKm,
          average: closures.length > 0 ? Math.round(totalKm / closures.length) : 0,
          byVehicle: Object.entries(kmByVehicle)
            .map(([registration, km]) => ({ registration, km }))
            .sort((a, b) => b.km - a.km)
            .slice(0, 10),
        },
        incidents: {
          total: incidents.length,
          bySeverity: incidentsBySeverity,
          recent: incidents.slice(0, 10).map(i => ({
            date: new Date(i.created_at),
            vehicle: (i.vehicle as any)?.registration || '—',
            description: i.description || '',
            severity: i.severity,
          })),
        },
        maintenance: {
          completed: maintenance.filter(m => m.status === 'ready').length,
          inProgress: maintenance.filter(m => m.status === 'in_progress').length,
          pending: maintenance.filter(m => m.status === 'queued').length,
        },
        drivers: {
          total: members.length,
          active: members.filter(m => m.is_active).length,
          topPerformers: Object.values(driverStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5),
        },
      };
    },
    enabled: !!userFleetId,
  });
}
