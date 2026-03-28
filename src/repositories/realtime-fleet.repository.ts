import { supabase } from "@/integrations/supabase/client";

/** Données résolues pour une notification « clôture de créneau ». */
export interface ClosureNotificationContext {
  fleetId: string;
  driverUserId: string;
  driverFullName: string | null;
  revenueDeclared: number;
}

/** Contexte véhicule pour filtrer un incident par flotte. */
export interface VehicleFleetRow {
  registration: string;
  fleet_id: string;
}

/**
 * Requêtes Postgres utilisées par les notifications temps réel (évite Supabase dans les hooks).
 */
export class RealtimeFleetRepository {
  async getClosureNotificationContext(
    shiftId: string,
    closureRow: { revenue_declared?: number | null },
    targetFleetId: string,
  ): Promise<ClosureNotificationContext | null> {
    const { data: shift, error } = await supabase
      .from("creneaux_conducteurs")
      .select(
        `
        assignment_id,
        assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
          fleet_id,
          driver_user_id
        )
      `,
      )
      .eq("id", shiftId)
      .single();

    if (error || !shift) return null;

    const assignment = shift.assignment as
      | { fleet_id: string; driver_user_id: string }
      | null
      | undefined;
    if (!assignment || assignment.fleet_id !== targetFleetId) return null;

    const { data: profile } = await supabase
      .from("profils")
      .select("full_name")
      .eq("user_id", assignment.driver_user_id)
      .single();

    return {
      fleetId: assignment.fleet_id,
      driverUserId: assignment.driver_user_id,
      driverFullName: profile?.full_name ?? null,
      revenueDeclared: Number(closureRow.revenue_declared ?? 0),
    };
  }

  async getVehicleForIncident(vehicleId: string): Promise<VehicleFleetRow | null> {
    const { data: vehicle, error } = await supabase
      .from("vehicules")
      .select("registration, fleet_id")
      .eq("id", vehicleId)
      .single();
    if (error || !vehicle) return null;
    return vehicle as VehicleFleetRow;
  }

  async getVehicleRegistration(vehicleId: string): Promise<string | null> {
    const { data: vehicle, error } = await supabase
      .from("vehicules")
      .select("registration")
      .eq("id", vehicleId)
      .single();
    if (error || !vehicle) return null;
    return (vehicle as { registration: string }).registration ?? null;
  }
}
