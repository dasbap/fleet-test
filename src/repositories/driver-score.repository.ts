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
  incidents_score: number | null;
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
  id: string;
  driver_user_id: string;
  fleet_id: string;
  score_level: 'green' | 'orange' | 'red';
  financial_score: number;
  score_total: number | null;
  incidents_score: number;
  closure_delay_score: number | null;
  shift_discipline_score: number | null;
  operational_stability_score: number | null;
  model_version: string | null;
  model_metadata: Record<string, unknown> | null;
  last_calculated_at: string | null;
  created_at: string;
  driver?: {
    user_id: string;
    full_name: string | null;
  };
}

type SupabaseRpcError = {
  code?: string;
  message?: string;
  details?: string;
};

function isMissingTopDriverScoresRpc(error: SupabaseRpcError): boolean {
  const text = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    text.includes('get_top_driver_scores') &&
    (error.code === 'PGRST202' ||
      error.code === 'PGRST204' ||
      text.includes('could not find the function') ||
      text.includes('schema cache'))
  );
}

function isMissingScoreTotalColumn(error: SupabaseRpcError | null | undefined): boolean {
  if (!error || error.code !== '42703') return false;
  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return text.includes('score_total') || text.includes('scores_conducteurs.score_total');
}

function isMissingProfileRelationship(error: SupabaseRpcError | null | undefined): boolean {
  if (!error) return false;
  const text = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    text.includes('scores_conducteurs') &&
    text.includes('profils') &&
    (error.code === 'PGRST200' || text.includes('relationship') || text.includes('schema cache'))
  );
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
      if (isMissingScoreTotalColumn(error) || isMissingProfileRelationship(error)) {
        console.warn(
          'Driver scores embed/v2 columns unavailable; using direct scores fallback. Apply migration 20260702005000_restore_top_driver_scores_rpc.sql.',
          error.message,
        );
        return this.findByFleetDirect(fleetId);
      }

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
      if (isMissingTopDriverScoresRpc(error)) {
        console.warn(
          'get_top_driver_scores RPC unavailable; using direct driver scores fallback. Apply migration 20260702005000_restore_top_driver_scores_rpc.sql.',
          error.message,
        );
        return this.findTopByFleetDirect(fleetId, limit);
      }

      throw new Error(error.message);
    }

    return (data || []) as TopDriverScoreRow[];
  }

  private async findTopByFleetDirect(fleetId: string, limit: number): Promise<TopDriverScoreRow[]> {
    const boundedLimit = Math.min(Math.max(limit || 5, 1), 100);
    const { data, error } = await supabase
      .from('scores_conducteurs')
      .select(
        `
        id,
        driver_user_id,
        fleet_id,
        score_level,
        financial_score,
        score_total,
        incidents_score,
        closure_delay_score,
        shift_discipline_score,
        operational_stability_score,
        model_version,
        model_metadata,
        last_calculated_at,
        created_at,
        driver:profils!scores_conducteurs_driver_user_id_fkey(user_id, full_name)
      `,
      )
      .eq('fleet_id', fleetId)
      .order('score_total', { ascending: false, nullsFirst: false })
      .order('last_calculated_at', { ascending: false })
      .limit(boundedLimit);

    if (!error) {
      return this.withProfileFallback((data || []) as TopDriverScoreRow[]);
    }

    if (!isMissingScoreTotalColumn(error) && !isMissingProfileRelationship(error)) {
      throw new Error(error.message);
    }

    if (isMissingProfileRelationship(error) && !isMissingScoreTotalColumn(error)) {
      return this.findTopByFleetDirectWithoutEmbed(fleetId, boundedLimit);
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from('scores_conducteurs')
      .select(
        `
        id,
        driver_user_id,
        fleet_id,
        score_level,
        financial_score,
        last_calculated_at,
        created_at,
        driver:profils!scores_conducteurs_driver_user_id_fkey(user_id, full_name)
      `,
      )
      .eq('fleet_id', fleetId)
      .order('financial_score', { ascending: false, nullsFirst: false })
      .order('last_calculated_at', { ascending: false })
      .limit(boundedLimit);

    if (legacyError) {
      if (isMissingProfileRelationship(legacyError)) {
        return this.findTopByFleetLegacyWithoutEmbed(fleetId, boundedLimit);
      }

      throw new Error(legacyError.message);
    }

    return this.withProfileFallback(((legacyData || []) as Array<{
      id: string;
      driver_user_id: string;
      fleet_id: string;
      score_level: 'green' | 'orange' | 'red';
      financial_score: number;
      last_calculated_at: string | null;
      created_at: string;
      driver?: { user_id: string; full_name: string | null };
    }>).map((row) => ({
      ...row,
      score_total: row.financial_score,
      incidents_score: null,
      closure_delay_score: null,
      shift_discipline_score: null,
      operational_stability_score: null,
      model_version: null,
      model_metadata: null,
    })));
  }

  private async findByFleetDirect(fleetId: string): Promise<DriverScoreRow[]> {
    const { data, error } = await supabase
      .from('scores_conducteurs')
      .select(
        `
        id,
        driver_user_id,
        fleet_id,
        score_level,
        financial_score,
        score_total,
        incidents_score,
        closure_delay_score,
        shift_discipline_score,
        operational_stability_score,
        model_version,
        model_metadata,
        last_calculated_at,
        created_at
      `,
      )
      .eq('fleet_id', fleetId)
      .order('score_total', { ascending: false, nullsFirst: false })
      .order('last_calculated_at', { ascending: false });

    if (!error) {
      return this.withProfileFallback((data || []) as DriverScoreRow[]);
    }

    if (!isMissingScoreTotalColumn(error)) {
      throw new Error(error.message);
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from('scores_conducteurs')
      .select(
        `
        id,
        driver_user_id,
        fleet_id,
        score_level,
        financial_score,
        last_calculated_at,
        created_at
      `,
      )
      .eq('fleet_id', fleetId)
      .order('financial_score', { ascending: false, nullsFirst: false })
      .order('last_calculated_at', { ascending: false });

    if (legacyError) {
      throw new Error(legacyError.message);
    }

    const rows = ((legacyData || []) as Array<{
      id: string;
      driver_user_id: string;
      fleet_id: string;
      score_level: 'green' | 'orange' | 'red';
      financial_score: number;
      last_calculated_at: string;
      created_at: string;
    }>).map((row) => ({
      ...row,
      score_total: row.financial_score,
      incidents_score: null,
      closure_delay_score: null,
      shift_discipline_score: null,
      operational_stability_score: null,
      model_version: null,
      model_metadata: null,
    }));

    return this.withProfileFallback(rows);
  }

  private async findTopByFleetDirectWithoutEmbed(fleetId: string, limit: number): Promise<TopDriverScoreRow[]> {
    const { data, error } = await supabase
      .from('scores_conducteurs')
      .select(
        `
        id,
        driver_user_id,
        fleet_id,
        score_level,
        financial_score,
        score_total,
        incidents_score,
        closure_delay_score,
        shift_discipline_score,
        operational_stability_score,
        model_version,
        model_metadata,
        last_calculated_at,
        created_at
      `,
      )
      .eq('fleet_id', fleetId)
      .order('score_total', { ascending: false, nullsFirst: false })
      .order('last_calculated_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingScoreTotalColumn(error)) {
        return this.findTopByFleetLegacyWithoutEmbed(fleetId, limit);
      }
      throw new Error(error.message);
    }

    return this.withProfileFallback((data || []) as TopDriverScoreRow[]);
  }

  private async findTopByFleetLegacyWithoutEmbed(fleetId: string, limit: number): Promise<TopDriverScoreRow[]> {
    const { data, error } = await supabase
      .from('scores_conducteurs')
      .select(
        `
        id,
        driver_user_id,
        fleet_id,
        score_level,
        financial_score,
        last_calculated_at,
        created_at
      `,
      )
      .eq('fleet_id', fleetId)
      .order('financial_score', { ascending: false, nullsFirst: false })
      .order('last_calculated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    const rows = ((data || []) as Array<{
      id: string;
      driver_user_id: string;
      fleet_id: string;
      score_level: 'green' | 'orange' | 'red';
      financial_score: number;
      last_calculated_at: string | null;
      created_at: string;
    }>).map((row) => ({
      ...row,
      score_total: row.financial_score,
      incidents_score: null,
      closure_delay_score: null,
      shift_discipline_score: null,
      operational_stability_score: null,
      model_version: null,
      model_metadata: null,
    }));

    return this.withProfileFallback(rows);
  }

  private async withProfileFallback<T extends { driver_user_id: string; driver?: { user_id: string; full_name: string | null } }>(
    rows: T[],
  ): Promise<T[]> {
    const missingProfileRows = rows.filter((row) => !row.driver);
    if (missingProfileRows.length === 0) return rows;

    const userIds = Array.from(new Set(missingProfileRows.map((row) => row.driver_user_id)));
    const { data: profiles, error } = await supabase
      .from('profils')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (error) {
      console.warn('Unable to enrich driver scores with profiles:', error.message);
      return rows;
    }

    const profilesByUserId = new Map(
      ((profiles || []) as Array<{ user_id: string; full_name: string | null }>).map((profile) => [
        profile.user_id,
        profile,
      ]),
    );

    return rows.map((row) => ({
      ...row,
      driver: row.driver ?? profilesByUserId.get(row.driver_user_id) ?? undefined,
    }));
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
