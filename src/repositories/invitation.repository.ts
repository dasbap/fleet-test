import { supabase } from '@/integrations/supabase/client';
import type { IRepository } from './base.repository';

export interface FleetInvitation {
  id: string;
  fleet_id: string;
  code: string;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  created_by: string;
  created_at: string;
  // Joined data
  fleet?: {
    id: string;
    name: string;
  } | null;
  creator?: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface InvitationInsert {
  fleet_id: string;
  code: string;
  expires_at?: string | null;
  max_uses?: number | null;
  created_by: string;
}

export interface InvitationUpdate {
  expires_at?: string | null;
  max_uses?: number | null;
  current_uses?: number;
}

export interface InvitationFilters {
  fleet_id?: string;
}

export interface InvitationValidationRow {
  id: string;
  fleet_id: string;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  fleet: { name: string } | null;
}

/**
 * Repository pour l'accès aux données des invitations
 */
export class InvitationRepository implements IRepository<FleetInvitation, InvitationInsert, InvitationUpdate> {
  /**
   * Récupère toutes les invitations avec filtres optionnels
   */
  async findAll(filters?: InvitationFilters): Promise<FleetInvitation[]> {
    let query = supabase
      .from('flotte_invitations')
      .select(`
        *,
        fleet:flottes(id, name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.fleet_id) {
      query = query.eq('fleet_id', filters.fleet_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invitations:', error);
      throw new Error(error.message);
    }

    return (data || []) as FleetInvitation[];
  }

  /**
   * Récupère une invitation par son ID
   */
  async findById(id: string): Promise<FleetInvitation | null> {
    const { data, error } = await supabase
      .from('flotte_invitations')
      .select(`
        *,
        fleet:flottes(id, name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching invitation:', error);
      throw new Error(error.message);
    }

    return (data ?? null) as FleetInvitation | null;
  }

  /**
   * Récupère une invitation par son code
   */
  async findByCode(code: string): Promise<FleetInvitation | null> {
    const { data, error } = await supabase
      .from('flotte_invitations')
      .select(`
        *,
        fleet:flottes(id, name)
      `)
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('Error fetching invitation by code:', error);
      throw new Error(error.message);
    }

    return (data ?? null) as FleetInvitation | null;
  }

  /**
   * Crée une nouvelle invitation
   */
  async create(invitation: InvitationInsert): Promise<FleetInvitation> {
    const { data, error } = await supabase
      .from('flotte_invitations')
      .insert({
        fleet_id: invitation.fleet_id,
        code: invitation.code,
        expires_at: invitation.expires_at || null,
        max_uses: invitation.max_uses || null,
        created_by: invitation.created_by,
        current_uses: 0,
      })
      .select(`
        *,
        fleet:flottes(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      if (error.code === '23505') {
        throw new Error('Ce code d\'invitation existe déjà. Veuillez en choisir un autre.');
      }
      throw new Error(error.message);
    }

    return data as FleetInvitation;
  }

  /**
   * Met à jour une invitation
   */
  async update(id: string, updates: InvitationUpdate): Promise<FleetInvitation> {
    const { data, error } = await supabase
      .from('flotte_invitations')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        fleet:flottes(id, name)
      `)
      .maybeSingle();

    if (error) {
      console.error('Error updating invitation:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Invitation introuvable ou accès refusé');
    }

    return data as FleetInvitation;
  }

  /**
   * Supprime une invitation
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('flotte_invitations').delete().eq('id', id);

    if (error) {
      console.error('Error deleting invitation:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Appelle la RPC accepter_invitation. Retourne la réponse brute pour normalisation côté service.
   */
  async acceptInvitationRpc(code: string): Promise<{ data: unknown; error: { message: string } | null }> {
    const { data, error } = await supabase.rpc('accepter_invitation', { p_code: code });
    return { data, error: error ? { message: error.message } : null };
  }

  /**
   * Valide un code d'invitation via RPC SECURITY DEFINER — fonctionne en contexte anon (signup).
   * Évite les problèmes RLS pre-auth sur flotte_invitations + join flottes.
   */
  async findValidationByCode(code: string): Promise<InvitationValidationRow | null> {
    const { data, error } = await supabase.rpc('valider_code_invitation', { p_code: code });

    if (error) {
      console.error('Error validating invitation by code (rpc):', error);
      throw new Error(error.message);
    }

    const result = data as { valid: boolean; fleet_id?: string; fleet_name?: string; invitation_id?: string; reason?: string } | null;
    if (!result?.valid) return null;

    return {
      id:           result.invitation_id!,
      fleet_id:     result.fleet_id!,
      expires_at:   null, // déjà validé côté DB
      max_uses:     null, // idem
      current_uses: 0,
      fleet:        result.fleet_name ? { name: result.fleet_name } : null,
    };
  }

  /**
   * Incrémente le compteur d'utilisation d'une invitation
   */
  async incrementUses(id: string): Promise<void> {
    const invitation = await this.findById(id);
    if (!invitation) {
      throw new Error('Invitation introuvable');
    }

    await this.update(id, {
      current_uses: invitation.current_uses + 1,
    });
  }
}
