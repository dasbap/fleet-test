import { supabase } from '@/integrations/supabase/client';
import { throwIfSupabaseInfrastructureError } from '@/lib/supabase-runtime-errors';
import type { FleetMetrics } from '@/types/fleet-metrics';
import type { KpiSummary } from '@/types/dashboard';

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

function throwSupabaseRepositoryError(error: { message: string }, context: string): never {
  throwIfSupabaseInfrastructureError(error, context);
  throw new Error(error.message);
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

    const statsError = [
      vehiclesResult.error,
      driversResult.error,
      incidentsResult.error,
      closuresResult.error,
      maintenanceResult.error,
      assignmentsResult.error,
    ].find(Boolean);
    if (statsError) throwSupabaseRepositoryError(statsError, 'dashboard stats');

    const vehicles = vehiclesResult.data || [];
    const drivers = driversResult.data || [];
    const incidents = incidentsResult.data || [];
    const closures = closuresResult.data || [];
    const maintenance = maintenanceResult.data || [];
    const activeAssignments = assignmentsResult.data || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayClosures, error: todayClosuresError } = await supabase
      .from('clotures_creneaux')
      .select('revenue_declared, status')
      .gte('created_at', today.toISOString())
      .eq('status', 'validated');
    if (todayClosuresError) {
      throwSupabaseRepositoryError(todayClosuresError, 'dashboard stats today closures');
    }

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

    const activityError = [closures.error, incidents.error, maintenance.error].find(Boolean);
    if (activityError) {
      throwSupabaseRepositoryError(activityError, 'dashboard recent activity');
    }

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
    if (error) throwSupabaseRepositoryError(error, 'dashboard cached metrics');
    return data as FleetMetrics;
  }

  async invalidateMetricsCache(fleetId: string): Promise<void> {
    const { error } = await supabase.rpc('invalidate_fleet_metrics_cache', {
      p_fleet_id: fleetId,
    });
    if (error) throwSupabaseRepositoryError(error, 'dashboard metrics cache invalidation');
  }

  /** Snapshot agrégé sans RPC distante : stats + KPIs + carburant 90j. */
  async getDashboardSnapshot(fleetId: string, _orgId: string): Promise<DashboardSnapshot> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayIso = startOfToday.toISOString();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [
      vehiclesResult,
      driversResult,
      activeAssignmentsResult,
      allAssignmentsResult,
      maintenanceResult,
      alertsResult,
    ] = await Promise.all([
      supabase
        .from('vehicules')
        .select('id, status, created_at')
        .eq('fleet_id', fleetId),
      supabase
        .from('flotte_adhesions')
        .select('user_id')
        .eq('fleet_id', fleetId)
        .eq('role', 'driver')
        .eq('is_active', true),
      supabase
        .from('affectations_vehicules')
        .select('id')
        .eq('fleet_id', fleetId)
        .eq('is_active', true),
      supabase
        .from('affectations_vehicules')
        .select('id')
        .eq('fleet_id', fleetId),
      supabase
        .from('travaux_maintenance')
        .select('id')
        .eq('fleet_id', fleetId)
        .eq('status', 'in_progress'),
      supabase
        .from('alertes_automatiques')
        .select('severity, alert_type, created_at')
        .eq('fleet_id', fleetId)
        .eq('resolved', false),
    ]);

    const firstError = [
      vehiclesResult,
      driversResult,
      activeAssignmentsResult,
      allAssignmentsResult,
      maintenanceResult,
      alertsResult,
    ].find((result) => result.error)?.error;
    if (firstError) throwSupabaseRepositoryError(firstError, 'dashboard snapshot');

    const vehicles = vehiclesResult.data ?? [];
    const vehicleIds = vehicles.map((vehicle) => vehicle.id);
    const allAssignmentIds = (allAssignmentsResult.data ?? []).map((assignment) => assignment.id);

    const incidentsResult = vehicleIds.length
      ? await supabase
          .from('incidents')
          .select('id')
          .in('vehicle_id', vehicleIds)
          .gte('created_at', thirtyDaysAgo)
      : { data: [], error: null };
    if (incidentsResult.error) {
      throwSupabaseRepositoryError(incidentsResult.error, 'dashboard snapshot incidents');
    }

    const shiftsResult = allAssignmentIds.length
      ? await supabase
          .from('creneaux_conducteurs')
          .select('id')
          .in('assignment_id', allAssignmentIds)
      : { data: [], error: null };
    if (shiftsResult.error) {
      throwSupabaseRepositoryError(shiftsResult.error, 'dashboard snapshot shifts');
    }

    const shiftIds = (shiftsResult.data ?? []).map((shift) => shift.id);
    const closuresResult = shiftIds.length
      ? await supabase
          .from('clotures_creneaux')
          .select('revenue_declared, status, created_at')
          .in('shift_id', shiftIds)
      : { data: [], error: null };
    if (closuresResult.error) {
      throwSupabaseRepositoryError(closuresResult.error, 'dashboard snapshot closures');
    }

    const closures = closuresResult.data ?? [];
    const fuelRows: Array<{ liters: number | null; amount_xof: number | null }> = [];
    const alerts = alertsResult.data ?? [];
    const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'ok').length;
    const maintenanceInProgress = maintenanceResult.data?.length ?? 0;
    const totalLiters = fuelRows.reduce((sum, row) => sum + Number(row.liters ?? 0), 0);
    const totalAmountXof = fuelRows.reduce((sum, row) => sum + Number(row.amount_xof ?? 0), 0);

    return {
      stats: {
        activeVehicles,
        totalVehicles: vehicles.length,
        blockedVehicles: vehicles.filter((vehicle) => vehicle.status === 'blocked').length,
        activeDrivers: activeAssignmentsResult.data?.length ?? 0,
        totalDrivers: driversResult.data?.length ?? 0,
        pendingIncidents: incidentsResult.data?.length ?? 0,
        todayRevenue: closures
          .filter((closure) => closure.status === 'validated' && closure.created_at >= startOfTodayIso)
          .reduce((sum, closure) => sum + Number(closure.revenue_declared ?? 0), 0),
        pendingClosures: closures.filter((closure) => closure.status === 'pending').length,
        maintenanceInProgress,
      },
      kpis: {
        activeVehicles,
        inMaintenance: maintenanceInProgress,
        criticalAlerts: alerts.filter((alert) => alert.severity === 'critical').length,
        overdueServices: alerts.filter((alert) => alert.alert_type === 'maintenance_due').length,
        deltaCritical: alerts.filter(
          (alert) => alert.severity === 'critical' && alert.created_at >= twentyFourHoursAgo,
        ).length,
        deltaActive: vehicles.filter((vehicle) => vehicle.created_at >= thirtyDaysAgo).length,
      },
      fuelSummary: {
        totalLiters,
        totalAmountXof,
        entryCount: fuelRows.length,
        avgCostPerLiter: totalLiters > 0 ? totalAmountXof / totalLiters : 0,
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

    if (error) throwSupabaseRepositoryError(error, 'dashboard fleet vehicles overview');

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
