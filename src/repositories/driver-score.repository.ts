import { supabase } from '@/integrations/supabase/client';

export type DriverScoreLevel = 'green' | 'orange' | 'red';

export interface DriverScoreRow {
  id: string;
  driver_user_id: string;
  fleet_id: string;
  score_level: 'green' | 'orange' | 'red';
  financial_score: number;
  score_total: number | null;
  incidents_score: number | null;
  closure_delay_score: number | null;
  shift_discipline_score: number | null;
  operational_stability_score: number | null;
  model_version: string | null;
  model_metadata: Record<string, unknown> | null;
  last_calculated_at: string;
  created_at: string;
  driver?: {
    user_id: string;
    full_name: string | null;
  };
}

export interface DriverScoreSnapshotRow {
  id: string;
  fleet_id: string;
  driver_user_id: string;
  score_level: 'green' | 'orange' | 'red';
  score_total: number;
  incidents_score: number;
  closure_delay_score: number;
  shift_discipline_score: number;
  operational_stability_score: number;
  model_version: string;
  model_metadata: Record<string, unknown>;
  calculated_at: string;
  created_at: string;
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
      throw new Error(error.message);
    }
    return (data || []) as DriverScoreRow[];
  }

  async calculateScoreV2(
    driverUserId: string,
    fleetId: string,
    modelVersion: string = 'v1-hybrid',
  ): Promise<DriverScoreLevel> {
    const { data, error } = await supabase.rpc('calculer_score_conducteur_v2', {
      p_driver_user_id: driverUserId,
      p_fleet_id: fleetId,
      p_model_version: modelVersion,
    });
    if (error) throw new Error(error.message);
    if (data === 'green' || data === 'orange' || data === 'red') {
      return data;
    }
    throw new Error('Réponse de scoring invalide');
  }

  async findSnapshotsByDriver(driverUserId: string, fleetId: string): Promise<DriverScoreSnapshotRow[]> {
    const { data, error } = await supabase
      .from('driver_score_snapshots')
      .select('*')
      .eq('driver_user_id', driverUserId)
      .eq('fleet_id', fleetId)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as DriverScoreSnapshotRow[];
  }
}
