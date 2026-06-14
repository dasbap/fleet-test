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

export interface FindDriverScoresOptions {
  limit?: number;
}

/** Ligne retournée par RPC get_top_driver_scores (dashboard analytics). */
export interface TopDriverScoreRow {
  driver_user_id: string;
  full_name: string | null;
  phone: string | null;
  score_total: number;
  score_level: 'green' | 'yellow' | 'orange' | 'red';
  financial_score: number;
  incidents_score: number;
  last_calculated_at: string | null;
}

export class DriverScoreRepository {
  async findByFleet(
    fleetId: string,
    options?: FindDriverScoresOptions,
  ): Promise<DriverScoreRow[]> {
    if (options?.limit && options.limit > 0) {
      // RPC top scores : forme plate (full_name) ≠ jointure table scores_conducteurs
      return this.findTopByFleet(fleetId, options.limit) as unknown as DriverScoreRow[];
    }

    const query = supabase
      .from('scores_conducteurs')
      .select(
        `
        *,
        driver:profils!scores_conducteurs_driver_user_id_fkey(user_id, full_name)
      `
      )
      .eq('fleet_id', fleetId)
      .order('score_total', { ascending: false, nullsFirst: false })
      .order('last_calculated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }
    return (data || []) as DriverScoreRow[];
  }

  async findTopByFleet(fleetId: string, limit: number): Promise<TopDriverScoreRow[]> {
    const { data, error } = await supabase.rpc('get_top_driver_scores', {
      p_fleet_id: fleetId,
      p_limit: limit,
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as TopDriverScoreRow[];
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
