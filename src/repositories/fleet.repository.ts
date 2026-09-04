import { supabase } from '@/integrations/supabase/client';

export interface FleetInfo {
  id: string;
  name: string;
  orgId?: string;
  country_code?: string;
  async findCountryCodeById(fleetId: string): Promise<string> {
    const { data: fleet, error: fleetError } = await supabase
      .from('flottes')
      .select('org_id')
      .eq('id', fleetId)
      .maybeSingle();

    if (fleetError) {
      throw new Error(fleetError.message);
    }
    if (!fleet?.org_id) {
      return 'CM';
    }

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .select('country_code')
      .eq('id', fleet.org_id)
      .maybeSingle();

    if (orgError) {
      throw new Error(orgError.message);
    }

    return org?.country_code?.trim().toUpperCase() || 'CM';
  }

}

/**
 * Repository pour l'accès aux données des flottes (liste utilisateur, etc.).
 * Note : le join `organisations(...)` est volontairement évité (cache FK PostgREST instable) ;
 * on lit `org_id` directement. Si un join est réintroduit, passer par `asSingleRelation`.
 */
export class FleetRepository {
  /**
   * Récupère les flottes par liste d'IDs (org via `org_id`).
   */
  async findByIds(fleetIds: string[]): Promise<FleetInfo[]> {
    if (fleetIds.length === 0) return [];

    const { data, error } = await supabase
      .from('flottes')
      .select('id, name, org_id')
      .in('id', fleetIds);

    if (error) {
      console.error('Erreur lors de la récupération des flottes:', error);
      throw new Error(error.message);
    }

    return (data || []).map((row: { id: string; name: string; org_id: string | null }) => ({
      id: row.id,
      name: row.name,
      orgId: row.org_id ?? undefined,
    }));
  }
}
