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

    // Sélection directe de org_id sur flottes — évite le join PostgREST (FK schema cache instable)
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
