import { supabase } from '@/integrations/supabase/client';
import type {
  FleetDriverActivationFlagRow,
  FleetDriverActivationHealth,
} from '@/types/fleet-driver-activation-health';

export class FleetDriverActivationRepository {
  async getFleetHealth(fleetId: string): Promise<FleetDriverActivationHealth | null> {
    const { data, error } = await supabase.rpc('fleet_driver_activation_health', {
      p_fleet_id: fleetId,
    });

    if (error) {
      console.error('fleet_driver_activation_health:', error);
      throw new Error(error.message);
    }

    if (data == null || typeof data !== 'object') return null;
    const row = data as Record<string, unknown>;
    const driversRaw = row.drivers;
    const drivers: FleetDriverActivationFlagRow[] = Array.isArray(driversRaw)
      ? (driversRaw as FleetDriverActivationFlagRow[])
      : [];

    return {
      total_drivers: Number(row.total_drivers ?? 0),
      with_phone_count: Number(row.with_phone_count ?? 0),
      never_shifted_count: Number(row.never_shifted_count ?? 0),
      pct_with_phone: Number(row.pct_with_phone ?? 0),
      drivers,
    };
  }
}
