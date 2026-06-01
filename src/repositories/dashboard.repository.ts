import { supabase } from '@/integrations/supabase/client';
import type { FleetMetrics } from '@/types/fleet-metrics';
import type { KpiSummary } from '@/types/dashboard';
import { mapRpcKpiSummary } from '@/lib/dashboard-kpis';

export interface DashboardFuelSummary {
  totalLiters: number;
  totalAmountXof: number;
  entryCount: number;
  avgCostPerLiter: number;
}

export interface DashboardSnapshot {
  stats: DashboardStats;
  kpis: KpiSummary;
  fuelSummary: DashboardFuelSummary;
}

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

export interface RecentActivityItem {
  id: string;
  type: 'closure' | 'incident' | 'maintenance';
  message: string;
  detail: string;
  time: Date;
  status?: string;
}

export interface FleetVehicleOverviewItem {
  id: string;
  registration: string;
  brand: string | null;
  model: string | null;
  current_km: number;
  status: string;
  blocked_reason: string | null;
  driver: string | null;
  hasActiveAssignment: boolean;
}

/**
 * Repository pour les données agrégées du tableau de bord
 */
export class DashboardRepository {
  async getStats(fleetId: string): Promise<DashboardStats> {
    const [
      vehiclesResult,
      driversResult,
      incidentsResult,
      closuresResult,
      maintenanceResult,
      assignmentsResult,
    ] = await Promise.all([
      supabase
        .from('vehicules')
        .select('id, status')
        .eq('fleet_id', fleetId),
      supabase
        .from('flotte_adhesions')
        .select('user_id')
        .eq('fleet_id', fleetId)
        .eq('role', 'driver')
        .eq('is_active', true),
      supabase
        .from('incidents')
        .select('id, vehicle_id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('clotures_creneaux')
        .select('id, revenue_declared, status')
        .eq('status', 'pending'),
      supabase
        .from('travaux_maintenance')
        .select('id, status')
        .eq('fleet_id', fleetId)
        .eq('status', 'in_progress'),
      supabase
        .from('affectations_vehicules')
        .select('id')
        .eq('fleet_id', fleetId)
        .eq('is_active', true),
    ]);

    const vehicles = vehiclesResult.data || [];
    const drivers = driversResult.data || [];
    const incidents = incidentsResult.data || [];
    const closures = closuresResult.data || [];
    const maintenance = maintenanceResult.data || [];
    const activeAssignments = assignmentsResult.data || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayClosures } = await supabase
      .from('clotures_creneaux')
      .select('revenue_declared, status')
      .gte('created_at', today.toISOString())
      .eq('status', 'validated');

    const todayRevenue = (todayClosures || []).reduce((sum, c) => sum + (c.revenue_declared || 0), 0);

    return {
      activeVehicles: vehicles.filter((v: { status: string }) => v.status === 'ok').length,
      totalVehicles: vehicles.length,
      blockedVehicles: vehicles.filter((v: { status: string }) => v.status === 'blocked').length,
      activeDrivers: activeAssignments.length,
      totalDrivers: drivers.length,
      pendingIncidents: incidents.length,
      todayRevenue,
      pendingClosures: closures.length,
      maintenanceInProgress: maintenance.length,
    };
  }

  async getRecentActivity(fleetId: string): Promise<RecentActivityItem[]> {
    const [closures, incidents, maintenance] = await Promise.all([
      supabase
        .from('clotures_creneaux')
        .select(`
          id, revenue_declared, status, created_at,
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
        .eq('fleet_id', fleetId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const activities: RecentActivityItem[] = [];

    (closures.data || []).forEach((c: Record<string, unknown>) => {
      const vehicle = (c.shift as Record<string, unknown>)?.assignment?.vehicle?.registration || 'Véhicule';
      activities.push({
        id: `closure-${c.id}`,
        type: 'closure',
        message:
          c.status === 'validated'
            ? 'Clôture validée'
            : c.status === 'rejected'
              ? 'Clôture rejetée'
              : 'Clôture en attente',
        detail: `${vehicle} - ${Number(c.revenue_declared || 0).toLocaleString()} FCFA`,
        time: new Date(c.created_at as string),
        status: c.status as string,
      });
    });

    (incidents.data || []).forEach((i: Record<string, unknown>) => {
      activities.push({
        id: `incident-${i.id}`,
        type: 'incident',
        message: `Incident ${i.severity}`,
        detail: `${(i.vehicle as Record<string, string>)?.registration || 'Véhicule'} - ${String(i.description || '').substring(0, 30)}...`,
        time: new Date(i.created_at as string),
      });
    });

    (maintenance.data || []).forEach((m: Record<string, unknown>) => {
      activities.push({
        id: `maintenance-${m.id}`,
        type: 'maintenance',
        message:
          m.status === 'ready'
            ? 'Intervention terminée'
            : m.status === 'in_progress'
              ? 'Intervention en cours'
              : 'Intervention en file',
        detail: `${(m.vehicle as Record<string, string>)?.registration || 'Véhicule'} - Priorité ${m.priority}`,
        time: new Date(m.created_at as string),
        status: m.status as string,
      });
    });

    return activities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);
  }

  /**
   * Métriques 30j depuis la RPC cachée (1h TTL côté Supabase).
   * À préférer à getStats() pour le widget KPI principal — 1 requête au lieu de 6.
   */
  async getMetricsCached(fleetId: string): Promise<FleetMetrics> {
    const { data, error } = await supabase.rpc('get_fleet_dashboard_metrics', {
      p_fleet_id: fleetId,
    });
    if (error) throw new Error(error.message);
    return data as FleetMetrics;
  }

  async invalidateMetricsCache(fleetId: string): Promise<void> {
    const { error } = await supabase.rpc('invalidate_fleet_metrics_cache', {
      p_fleet_id: fleetId,
    });
    if (error) throw new Error(error.message);
  }

  /** Snapshot agrégé (1 RPC) : stats + KPIs org + carburant 90j. */
  async getDashboardSnapshot(fleetId: string, orgId: string): Promise<DashboardSnapshot> {
    const { data, error } = await supabase.rpc('get_dashboard_snapshot', {
      p_fleet_id: fleetId,
      p_org_id: orgId,
    });
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Record<string, unknown>;
    const statsRaw = (raw.stats ?? {}) as Record<string, number>;
    const fuelRaw = (raw.fuelSummary ?? {}) as Record<string, number>;
    return {
      stats: {
        activeVehicles: statsRaw.activeVehicles ?? 0,
        totalVehicles: statsRaw.totalVehicles ?? 0,
        blockedVehicles: statsRaw.blockedVehicles ?? 0,
        activeDrivers: statsRaw.activeDrivers ?? 0,
        totalDrivers: statsRaw.totalDrivers ?? 0,
        pendingIncidents: statsRaw.pendingIncidents ?? 0,
        todayRevenue: statsRaw.todayRevenue ?? 0,
        pendingClosures: statsRaw.pendingClosures ?? 0,
        maintenanceInProgress: statsRaw.maintenanceInProgress ?? 0,
      },
      kpis: mapRpcKpiSummary(raw.kpis),
      fuelSummary: {
        totalLiters: Number(fuelRaw.totalLiters ?? 0),
        totalAmountXof: Number(fuelRaw.totalAmountXof ?? 0),
        entryCount: Number(fuelRaw.entryCount ?? 0),
        avgCostPerLiter: Number(fuelRaw.avgCostPerLiter ?? 0),
      },
    };
  }

  async getFleetVehiclesOverview(fleetId: string): Promise<FleetVehicleOverviewItem[]> {
    const { data, error } = await supabase
      .from('vehicules')
      .select(`
        id, registration, brand, model, current_km, status, blocked_reason,
        assignments:affectations_vehicules(id, is_active, driver_user_id)
      `)
      .eq('fleet_id', fleetId)
      .order('registration', { ascending: true })
      .limit(10);

    if (error) throw new Error(error.message);

    return (data || []).map((v: Record<string, unknown>) => {
      const assignments = v.assignments as Array<{ is_active: boolean }> | undefined;
      const activeAssignment = assignments?.find((a) => a.is_active);
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
    }) as FleetVehicleOverviewItem[];
  }
}
