import { supabase } from '@/integrations/supabase/client';

export interface DriverScoreRow {
  id: string;
  driver_user_id: string;
  fleet_id: string;
  score_level: 'green' | 'orange' | 'red';
  financial_score: number;
  last_calculated_at: string;
  created_at: string;
  driver?: {
    user_id: string;
    full_name: string | null;
  };
}

export class DriverScoreRepository {
  async findByFleet(fleetId: string): Promise<DriverScoreRow[]> {
    const { data, error } = await supabase
      .from('scores_conducteurs')
      .select(
        `
        *,
        driver:profils!scores_conducteurs_driver_user_id_fkey(user_id, full_name)
      `
      )
      .eq('fleet_id', fleetId)
      .order('financial_score', { ascending: true });

    if (error) {
      console.error('Error fetching driver scores:', error);
      throw new Error(error.message);
    }
    return (data || []) as DriverScoreRow[];
  }

  async calculateScore(driverUserId: string, fleetId: string): Promise<unknown> {
    const { data, error } = await supabase.rpc('calculer_score_conducteur', {
      p_driver_user_id: driverUserId,
      p_fleet_id: fleetId,
    });
    if (error) throw new Error(error.message);
    return data;
  }
}
