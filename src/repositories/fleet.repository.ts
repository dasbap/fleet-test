import { supabase } from '@/integrations/supabase/client';

export interface FleetInfo {
  id: string;
  name: string;
  orgId?: string;
  country_code?: string;
}

/**
 * Repository pour l'accès aux données des flottes (liste utilisateur, etc.)
 */
export class FleetRepository {
  /**
   * Récupère les flottes par liste d'IDs avec country_code via organisations.
   */
  async findByIds(fleetIds: string[]): Promise<FleetInfo[]> {
    if (fleetIds.length === 0) return [];

    const { data, error } = await supabase
      .from('flottes')
      .select('id, name, organisations(id, country_code)')
      .in('id', fleetIds);

    if (error) {
      console.error('Erreur lors de la récupération des flottes:', error);
      throw new Error(error.message);
    }

    return (data || []).map((row: { id: string; name: string; organisations: { id: string; country_code: string } | null }) => ({
      id: row.id,
      name: row.name,
      orgId: row.organisations?.id ?? undefined,
      country_code: row.organisations?.country_code,
    }));
  }
}
