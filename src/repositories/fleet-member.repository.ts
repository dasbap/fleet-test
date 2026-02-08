import { supabase } from '@/integrations/supabase/client';
import type { IRepository } from './base.repository';

export type RoleType = 'organizer' | 'manager' | 'driver' | 'mechanic';

export interface FleetMember {
  id: string;
  user_id: string;
  fleet_id: string;
  role: RoleType;
  is_active: boolean;
  created_at: string;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
  email: string | null;
}

export interface FleetMemberInsert {
  fleet_id: string;
  user_id: string;
  role: RoleType;
  is_active?: boolean;
}

export interface FleetMemberUpdate {
  role?: RoleType;
  is_active?: boolean;
}

export interface FleetMemberFilters {
  fleet_id?: string;
  user_id?: string;
  role?: RoleType;
  is_active?: boolean;
}

/**
 * Repository pour l'accès aux données des membres de flotte
 */
export class FleetMemberRepository implements IRepository<FleetMember, FleetMemberInsert, FleetMemberUpdate> {
  /**
   * Récupère tous les membres d'une flotte avec leurs profils
   */
  async findAll(filters?: FleetMemberFilters): Promise<FleetMember[]> {
    let query = supabase
      .from('flotte_adhesions')
      .select(`
        id,
        user_id,
        fleet_id,
        role,
        is_active,
        created_at,
        profile:profils!flotte_adhesions_user_id_fkey(full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (filters?.fleet_id) {
      query = query.eq('fleet_id', filters.fleet_id);
    }

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching fleet members:', error);
      throw new Error(error.message);
    }

    // Note: Les emails ne sont pas récupérables directement pour des raisons de sécurité
    return (data || []).map((member: any) => ({
      ...member,
      email: null, // Sera récupéré côté serveur si nécessaire
    })) as FleetMember[];
  }

  /**
   * Récupère un membre par son ID
   */
  async findById(id: string): Promise<FleetMember | null> {
    const { data, error } = await supabase
      .from('flotte_adhesions')
      .select(`
        id,
        user_id,
        fleet_id,
        role,
        is_active,
        created_at,
        profile:profils!flotte_adhesions_user_id_fkey(full_name, phone)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching fleet member:', error);
      throw new Error(error.message);
    }

    return {
      ...data,
      email: null,
    } as FleetMember;
  }

  /**
   * Crée un nouveau membre de flotte
   */
  async create(member: FleetMemberInsert): Promise<FleetMember> {
    const { data, error } = await supabase
      .from('flotte_adhesions')
      .insert({
        fleet_id: member.fleet_id,
        user_id: member.user_id,
        role: member.role,
        is_active: member.is_active ?? true,
      })
      .select(`
        id,
        user_id,
        fleet_id,
        role,
        is_active,
        created_at,
        profile:profils!flotte_adhesions_user_id_fkey(full_name, phone)
      `)
      .single();

    if (error) {
      console.error('Error creating fleet member:', error);
      throw new Error(error.message);
    }

    return {
      ...data,
      email: null,
    } as FleetMember;
  }

  /**
   * Met à jour un membre de flotte
   */
  async update(id: string, updates: FleetMemberUpdate): Promise<FleetMember> {
    const { data, error } = await supabase
      .from('flotte_adhesions')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        user_id,
        fleet_id,
        role,
        is_active,
        created_at,
        profile:profils!flotte_adhesions_user_id_fkey(full_name, phone)
      `)
      .single();

    if (error) {
      console.error('Error updating fleet member:', error);
      throw new Error(error.message);
    }

    return {
      ...data,
      email: null,
    } as FleetMember;
  }

  /**
   * Supprime un membre de flotte
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('flotte_adhesions').delete().eq('id', id);

    if (error) {
      console.error('Error deleting fleet member:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Ajoute un membre par email via la fonction RPC
   */
  async addMemberByEmail(fleetId: string, email: string, role: RoleType): Promise<string | null> {
    const { data: membershipId, error } = await supabase.rpc('ajouter_membre_par_email', {
      p_fleet_id: fleetId,
      p_email: email,
      p_role: role,
    });

    if (error) {
      console.error('Error adding member by email:', error);
      throw new Error(error.message);
    }

    return membershipId;
  }

  /**
   * Crée ou met à jour une adhésion via la fonction RPC
   */
  async upsertMembership(
    fleetId: string,
    userId: string,
    role: RoleType,
    isActive: boolean = true
  ): Promise<string> {
    const { data: membershipId, error } = await supabase.rpc('creer_ou_mettre_a_jour_adhesion_flotte', {
      p_fleet_id: fleetId,
      p_user_id: userId,
      p_role: role,
      p_is_active: isActive,
    });

    if (error || !membershipId) {
      console.error('Error upserting membership:', error);
      throw new Error(error?.message || 'Impossible de créer ou mettre à jour l\'adhésion.');
    }

    return membershipId;
  }

  /**
   * Désactive un membre (le retire de l'équipe)
   */
  async deactivateMember(membershipId: string): Promise<void> {
    await this.update(membershipId, { is_active: false });
  }
}
