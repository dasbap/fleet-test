import { supabase } from '@/integrations/supabase/client';

/**
 * Repository pour les opérations de setup ESAMBA (organisation, flotte, RPC).
 * Encapsule tous les appels Supabase liés au seed et à la création de flotte.
 */
export class EsambaSetupRepository {
  /**
   * Récupère l'ID d'une organisation par son nom.
   */
  async findOrganisationIdByName(name: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('organisations')
      .select('id')
      .eq('name', name)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erreur findOrganisationIdByName:', error);
      throw new Error(error.message);
    }
    return data?.id ?? null;
  }

  /**
   * Crée une organisation et retourne son ID.
   */
  async createOrganisation(name: string, countryCode: string): Promise<string> {
    const { data, error } = await supabase
      .from('organisations')
      .insert({ name, country_code: countryCode })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Impossible de créer l\'organisation.');
    }
    return data.id as string;
  }

  /**
   * Appelle la RPC creer_flotte_esamba.
   */
  async creerFlotteEsamba(
    pOrgId: string,
    pName: string,
    pCollectionPolicy: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('creer_flotte_esamba', {
      p_org_id: pOrgId,
      p_name: pName,
      p_collection_policy: pCollectionPolicy,
    });

    if (error || data == null) {
      throw new Error(error?.message ?? 'Impossible de créer la flotte.');
    }
    const fleetId =
      typeof data === 'string' ? data : (data as { id?: string; fleet_id?: string })?.id ?? (data as { id?: string; fleet_id?: string })?.fleet_id ?? null;
    if (!fleetId) {
      throw new Error('Impossible de créer la flotte (aucun identifiant retourné).');
    }
    return fleetId;
  }

  /**
   * Appelle la RPC creer_ou_mettre_a_jour_adhesion_flotte.
   */
  async creerOuMettreAJourAdhesionFlotte(
    pFleetId: string,
    pUserId: string,
    pRole: string,
    pIsActive: boolean
  ): Promise<string> {
    const { data, error } = await supabase.rpc('creer_ou_mettre_a_jour_adhesion_flotte', {
      p_fleet_id: pFleetId,
      p_user_id: pUserId,
      p_role: pRole,
      p_is_active: pIsActive,
    });

    if (error) {
      throw new Error(error.message ?? 'Impossible de créer ou mettre à jour le membership.');
    }
    return (data as string) ?? '';
  }

  /**
   * Appelle la RPC creer_vehicule_esamba.
   */
  async creerVehiculeEsamba(
    pFleetId: string,
    pRegistration: string,
    pBrand: string,
    pModel: string,
    pYear: number,
    pCurrentKm: number
  ): Promise<string> {
    const { data, error } = await supabase.rpc('creer_vehicule_esamba', {
      p_fleet_id: pFleetId,
      p_registration: pRegistration,
      p_brand: pBrand,
      p_model: pModel,
      p_year: pYear,
      p_current_km: pCurrentKm,
    });

    if (error || !data) {
      throw new Error(error?.message ?? 'Impossible de créer le véhicule.');
    }
    return data as string;
  }

  /**
   * Appelle la RPC creer_invitation_esamba.
   */
  async creerInvitationEsamba(pFleetId: string, pCode: string): Promise<string> {
    const { data, error } = await supabase.rpc('creer_invitation_esamba', {
      p_fleet_id: pFleetId,
      p_code: pCode,
    });

    if (error || !data) {
      throw new Error(error?.message ?? 'Impossible de créer l\'invitation.');
    }
    return data as string;
  }
}
