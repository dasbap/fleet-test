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
type SupabaseRpcError = {
  code?: string;
  message?: string;
  details?: string;
};

function isRecoverableMembersRpcOutage(error: SupabaseRpcError): boolean {
  const text = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  const isMissingRpc =
    error.code === 'PGRST202' ||
    error.code === 'PGRST204' ||
    text.includes('could not find the function') ||
    text.includes('schema cache');

  return (
    isMissingRpc &&
    (text.includes('get_fleet_members') || text.includes('rbac_check_permission'))
  );
}

export class FleetMemberRepository implements IRepository<FleetMember, FleetMemberInsert, FleetMemberUpdate> {
  private async findAllDirectByFleet(fleetId: string): Promise<FleetMember[]> {
    const { data: memberships, error } = await supabase
      .from('flotte_adhesions')
      .select('id, user_id, fleet_id, role, is_active, created_at')
      .eq('fleet_id', fleetId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching fleet members directly:', error);
      throw new Error(error.message);
    }

    const userIds = Array.from(new Set((memberships || []).map((member) => member.user_id as string)));
    const { data: profiles, error: profileError } = userIds.length > 0
      ? await supabase.from('profils').select('user_id, full_name, phone').in('user_id', userIds)
      : { data: [], error: null };

    if (profileError) {
      console.warn('Unable to enrich fleet members with profiles:', profileError.message);
    }

    const profilesByUserId = new Map(
      (profiles || []).map((profile: { user_id: string; full_name: string | null; phone: string | null }) => [
        profile.user_id,
        profile,
      ]),
    );

    return ((memberships || []) as Array<{
      id: string;
      user_id: string;
      fleet_id: string;
      role: RoleType;
      is_active: boolean;
      created_at: string;
    }>).map((member) => {
      const profile = profilesByUserId.get(member.user_id);
      return {
        ...member,
        profile: profile
          ? {
              full_name: profile.full_name,
              phone: profile.phone,
            }
          : null,
        email: null,
      };
    });
  }
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
    return (data || []).map((member) => ({
      ...member,
      email: null, // Sera récupéré côté serveur si nécessaire
    })) as FleetMember[];
  }

  /**
   * Adhésions actives pour un utilisateur, sans jointure profils.
   * Utilisé pour la session (useAuth) : évite les échecs PostgREST si l'embed profils
   * ou les politiques sur `profils` bloquent la réponse complète.
   */
  async findActiveRowsForUser(userId: string): Promise<
    Pick<FleetMember, "id" | "user_id" | "fleet_id" | "role" | "is_active" | "created_at">[]
  > {
    if (!userId) {
      return [];
    }
    const { data, error } = await supabase
      .from("flotte_adhesions")
      .select("id, user_id, fleet_id, role, is_active, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      // AbortError pendant une transition auth (signInWithPassword) — non bloquant
      if (error.message?.includes("AbortError") || error.code === "20") {
        return [];
      }
      console.error("Error fetching fleet adhesions (minimal):", error);
      throw new Error(error.message);
    }

    return (data || []) as Pick<
      FleetMember,
      "id" | "user_id" | "fleet_id" | "role" | "is_active" | "created_at"
    >[];
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
      .maybeSingle();

    if (error) {
      console.error('Error fetching fleet member:', error);
      throw new Error(error.message);
    }

    if (!data) return null;

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
      .maybeSingle();

    if (error) {
      console.error('Error updating fleet member:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Membre de flotte introuvable ou accès refusé');
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

  /**
   * Liste les membres via RPC sécurisée (profils inclus).
   */
  async findAllViaRpc(fleetId: string): Promise<FleetMember[]> {
    const { data, error } = await supabase.rpc('get_fleet_members', {
      p_fleet_id: fleetId,
    });

    if (error) {
      if (isRecoverableMembersRpcOutage(error)) {
        console.warn(
          'get_fleet_members RPC unavailable; using direct membership fallback. Apply migrations 20260702002000_restore_rbac_check_permission.sql and 20260702003000_restore_get_fleet_members.sql.',
          error.message,
        );
        return this.findAllDirectByFleet(fleetId);
      }

      console.error('Error fetching fleet members via RPC:', error);
      throw new Error(error.message);
    }

    return ((data as Array<Record<string, unknown>>) ?? []).map((row) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      fleet_id: row.fleet_id as string,
      role: row.role as RoleType,
      is_active: row.is_active as boolean,
      created_at: row.created_at as string,
      profile: {
        full_name: (row.full_name as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
      },
      email: null,
    }));
  }

  /**
   * Met à jour le rôle via RPC (organizer uniquement côté serveur).
   */
  async updateRoleViaRpc(adhesionId: string, role: RoleType): Promise<string> {
    const { data, error } = await supabase.rpc('update_fleet_member_role', {
      p_adhesion_id: adhesionId,
      p_role: role,
    });

    if (error || !data) {
      console.error('Error updating member role via RPC:', error);
      throw new Error(error?.message ?? 'Impossible de modifier le rôle.');
    }

    return data as string;
  }

  /**
   * Retire complètement un membre de la flotte (tous rôles désactivés).
   */
  async offboardMember(userId: string, fleetId: string): Promise<void> {
    const { error } = await supabase.rpc('offboard_member', {
      p_user_id: userId,
      p_fleet_id: fleetId,
    });

    if (error) {
      console.error('Error offboarding member:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Adhésion active pour un couple user/flotte (checkPendingInvitation, RBAC).
   */
  async findActiveMembershipByUserAndFleet(
    userId: string,
    fleetId: string,
  ): Promise<Pick<FleetMember, 'id' | 'user_id' | 'fleet_id' | 'role' | 'is_active'> | null> {
    const { data, error } = await supabase
      .from('flotte_adhesions')
      .select('id, user_id, fleet_id, role, is_active')
      .eq('user_id', userId)
      .eq('fleet_id', fleetId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error finding active membership:', error);
      throw new Error(error.message);
    }

    return data as Pick<FleetMember, 'id' | 'user_id' | 'fleet_id' | 'role' | 'is_active'> | null;
  }

  /**
   * Met à jour le téléphone dans `profils` pour le user_id lié à l'adhésion.
   * Non bloquant : une erreur ici ne doit pas empêcher l'ajout du membre.
   */
  async updateMemberPhone(membershipId: string, phone: string): Promise<void> {
    const { data: membership, error: membershipError } = await supabase
      .from('flotte_adhesions')
      .select('user_id')
      .eq('id', membershipId)
      .maybeSingle();

    if (membershipError || !membership?.user_id) return;

    const { error } = await supabase
      .from('profils')
      .update({ phone })
      .eq('user_id', membership.user_id);

    if (error) {
      console.warn('updateMemberPhone: could not update profil phone', error.message);
    }
  }
}
