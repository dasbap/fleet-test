import { supabase } from '@/integrations/supabase/client';
import { normalizeFleetActivationMetrics } from '@/lib/fleet-activation-metrics';
import type { ActivationMetrics } from '@/types/activation-metrics';

export class FleetActivationRepository {
  async getMetricsByFleetId(fleetId: string): Promise<ActivationMetrics> {
    const { data, error } = await supabase.rpc('fleet_activation_metrics', {
      p_fleet_id: fleetId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return normalizeFleetActivationMetrics(data);
  }
}
