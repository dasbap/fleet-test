import { supabase } from '@/integrations/supabase/client';
import { asSingleRelation } from '@/lib/supabaseRelation';

export interface FleetReportRawRow {
  fleet: { name: string } | null;
  vehicles: Array<{ id: string; registration: string; status: string; current_km: number }>;
  closures: Array<{
    id: string;
    revenue_declared: number;
    status: string;
    created_at: string;
    shift?: {
      id: string;
      km_start: number;
      km_end: number | null;
      assignment?: {
        vehicle?: { registration: string };
        driver?: { full_name: string | null };
      };
    };
  }>;
  incidents: Array<{
    id: string;
    description: string;
    severity: string;
    created_at: string;
    vehicle?: { registration: string };
  }>;
  maintenance: Array<{ id: string; status: string; created_at: string }>;
  members: Array<{ user_id: string; role: string; is_active: boolean }>;
  scores: Array<{
    driver_user_id: string;
    score_level: string;
    financial_score: number;
    driver?: { user_id: string; full_name: string | null };
  }>;
}

type NestedVehicle = { registration: string };
type NestedDriver = { full_name: string | null };
type NestedAssignment = {
  vehicle?: NestedVehicle | NestedVehicle[] | null;
  driver?: NestedDriver | NestedDriver[] | null;
};
type NestedShift = {
  id: string;
  km_start: number;
  km_end: number | null;
  assignment?: NestedAssignment | NestedAssignment[] | null;
};

/**
 * Repository pour les données du rapport de flotte
 */
export class FleetReportRepository {
  async getReportRaw(fleetId: string, startISO: string, endISO: string): Promise<FleetReportRawRow> {
    const [
      fleetResult,
      vehiclesResult,
      closuresResult,
      incidentsResult,
      maintenanceResult,
      membersResult,
      scoresResult,
    ] = await Promise.all([
      supabase.from('flottes').select('name').eq('id', fleetId).maybeSingle(),
      supabase
        .from('vehicules')
        .select('id, registration, status, current_km')
        .eq('fleet_id', fleetId),
      supabase
        .from('clotures_creneaux')
        .select(`
          id, revenue_declared, status, created_at,
          shift:creneaux_conducteurs(
            id, km_start, km_end,
            assignment:affectations_vehicules(
              vehicle:vehicules(registration),
              driver:profils(full_name)
            )
          )
        `)
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      supabase
        .from('incidents')
        .select('id, description, severity, created_at, vehicle:vehicules(registration)')
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      supabase
        .from('travaux_maintenance')
        .select('id, status, created_at')
        .eq('fleet_id', fleetId)
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      supabase
        .from('flotte_adhesions')
        .select('user_id, role, is_active')
        .eq('fleet_id', fleetId)
        .eq('role', 'driver'),
      supabase
        .from('scores_conducteurs')
        .select(`
          driver_user_id, score_level, financial_score,
          driver:profils!scores_conducteurs_driver_user_id_fkey(user_id, full_name)
        `)
        .eq('fleet_id', fleetId),
    ]);

    return {
      fleet: fleetResult.data as FleetReportRawRow['fleet'],
      vehicles: (vehiclesResult.data || []) as FleetReportRawRow['vehicles'],
      closures: (closuresResult.data || []).map((row) => {
        const shift = asSingleRelation(row.shift as NestedShift | NestedShift[] | null);
        const assignment = asSingleRelation(shift?.assignment);
        return {
          id: row.id,
          revenue_declared: row.revenue_declared,
          status: row.status,
          created_at: row.created_at,
          shift: shift
            ? {
                id: shift.id,
                km_start: shift.km_start,
                km_end: shift.km_end,
                assignment: assignment
                  ? {
                      vehicle: asSingleRelation(assignment.vehicle) ?? undefined,
                      driver: asSingleRelation(assignment.driver) ?? undefined,
                    }
                  : undefined,
              }
            : undefined,
        };
      }),
      incidents: (incidentsResult.data || []).map((row) => ({
        id: row.id,
        description: row.description,
        severity: row.severity,
        created_at: row.created_at,
        vehicle: asSingleRelation(row.vehicle as NestedVehicle | NestedVehicle[] | null) ?? undefined,
      })),
      maintenance: (maintenanceResult.data || []) as FleetReportRawRow['maintenance'],
      members: (membersResult.data || []) as FleetReportRawRow['members'],
      scores: (scoresResult.data || []).map((row) => ({
        driver_user_id: row.driver_user_id,
        score_level: row.score_level,
        financial_score: row.financial_score,
        driver:
          asSingleRelation(
            row.driver as
              | { user_id: string; full_name: string | null }
              | { user_id: string; full_name: string | null }[]
              | null,
          ) ?? undefined,
      })),
    };
  }
}
