import { supabase } from '@/integrations/supabase/client';
import type {
  FleetDriverActivationFlagRow,
  FleetDriverActivationHealth,
} from '@/types/fleet-driver-activation-health';

export class FleetDriverActivationRepository {
  async getFleetHealth(fleetId: string): Promise<FleetDriverActivationHealth | null> {
    const { data: memberships, error: membershipError } = await supabase
      .from('flotte_adhesions')
      .select('user_id')
      .eq('fleet_id', fleetId)
      .eq('role', 'driver')
      .eq('is_active', true);

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    const driverIds = (memberships ?? []).map((row) => row.user_id);
    if (driverIds.length === 0) {
      return {
        total_drivers: 0,
        with_phone_count: 0,
        never_shifted_count: 0,
        pct_with_phone: 0,
        drivers: [],
      };
    }

    const [{ data: profiles, error: profilesError }, { data: assignments, error: assignmentsError }] =
      await Promise.all([
        supabase
          .from('profils')
          .select('user_id, phone')
          .in('user_id', driverIds),
        supabase
          .from('affectations_vehicules')
          .select('id, driver_user_id')
          .eq('fleet_id', fleetId)
          .in('driver_user_id', driverIds),
      ]);

    if (profilesError) throw new Error(profilesError.message);
    if (assignmentsError) throw new Error(assignmentsError.message);

    const assignmentRows = assignments ?? [];
    const assignmentIds = assignmentRows.map((row) => row.id);
    const shiftedDriverIds = new Set<string>();

    if (assignmentIds.length > 0) {
      const { data: shifts, error: shiftsError } = await supabase
        .from('creneaux_conducteurs')
        .select('assignment_id')
        .in('assignment_id', assignmentIds);

      if (shiftsError) throw new Error(shiftsError.message);

      const assignmentToDriver = new Map(
        assignmentRows.map((row) => [row.id, row.driver_user_id]),
      );
      (shifts ?? []).forEach((shift) => {
        const driverId = assignmentToDriver.get(shift.assignment_id);
        if (driverId) shiftedDriverIds.add(driverId);
      });
    }

    const phoneByUserId = new Map(
      (profiles ?? []).map((profile) => [profile.user_id, profile.phone]),
    );
    const drivers: FleetDriverActivationFlagRow[] = driverIds.map((userId) => {
      const phone = phoneByUserId.get(userId);
      return {
        user_id: userId,
        has_phone: typeof phone === 'string' && phone.trim().length > 0,
        has_ever_shift: shiftedDriverIds.has(userId),
      };
    });

    return {
      total_drivers: drivers.length,
      with_phone_count: drivers.filter((driver) => driver.has_phone).length,
      never_shifted_count: drivers.filter((driver) => !driver.has_ever_shift).length,
      pct_with_phone:
        drivers.length > 0
          ? Math.round((drivers.filter((driver) => driver.has_phone).length / drivers.length) * 100)
          : 0,
      drivers,
    };
  }
}
