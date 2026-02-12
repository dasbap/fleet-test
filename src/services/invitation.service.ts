import { InvitationRepository } from '@/repositories/invitation.repository';
import type {
  FleetInvitation,
  InvitationInsert,
  InvitationUpdate,
  InvitationFilters,
} from '@/repositories/invitation.repository';
import { FleetMemberRepository } from '@/repositories/fleet-member.repository';
import { supabase } from '@/integrations/supabase/client';

export interface AcceptInvitationResult {
  ok: boolean;
  error?: string | null;
  fleet_id?: string;
  membership_id?: string;
  message?: string;
}

function normalizeRpcResult(data: unknown): AcceptInvitationResult | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    return typeof first === 'object' && first !== null && 'ok' in first
      ? (first as AcceptInvitationResult)
      : null;
  }
  return typeof data === 'object' && data !== null && 'ok' in data
    ? (data as AcceptInvitationResult)
    : null;
}

/**
 * Service pour la logique métier des invitations
 */
export class InvitationService {
  constructor(
    private repository: InvitationRepository,
    private fleetMemberRepository: FleetMemberRepository
  ) {}

  /**
   * Récupère toutes les invitations d'une flotte
   */
  async getInvitations(fleetId?: string): Promise<FleetInvitation[]> {
    const filters: InvitationFilters = {};
    if (fleetId) {
      filters.fleet_id = fleetId;
    }
    return this.repository.findAll(filters);
  }

  /**
   * Récupère toutes les invitations avec filtres
   */
  async getAllInvitations(filters?: InvitationFilters): Promise<FleetInvitation[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Récupère une invitation par son ID
   */
  async getInvitationById(id: string): Promise<FleetInvitation | null> {
    if (!id) {
      throw new Error('L\'ID de l\'invitation est requis');
    }
    return this.repository.findById(id);
  }

  /**
   * Récupère une invitation par son code
   */
  async getInvitationByCode(code: string): Promise<FleetInvitation | null> {
    if (!code || code.trim() === '') {
      throw new Error('Le code d\'invitation est requis');
    }
    return this.repository.findByCode(code.trim().toUpperCase());
  }

  /**
   * Crée une nouvelle invitation avec validation métier
   */
  async createInvitation(data: Omit<InvitationInsert, 'created_by'>): Promise<FleetInvitation> {
    // Validation métier
    if (!data.fleet_id) {
      throw new Error('L\'ID de la flotte est requis');
    }

    if (!data.code || data.code.trim() === '') {
      throw new Error('Le code d\'invitation est requis');
    }

    // Normalisation du code (majuscules)
    const normalizedCode = data.code.trim().toUpperCase();

    // Validation de la date d'expiration si fournie
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at);
      if (isNaN(expiresAt.getTime())) {
        throw new Error('Date d\'expiration invalide');
      }
      if (expiresAt < new Date()) {
        throw new Error('La date d\'expiration ne peut pas être dans le passé');
      }
    }

    // Validation du nombre maximum d'utilisations
    if (data.max_uses !== undefined && data.max_uses !== null) {
      if (data.max_uses < 1) {
        throw new Error('Le nombre maximum d\'utilisations doit être supérieur à 0');
      }
    }

    // Récupérer l'utilisateur connecté
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('Non authentifié');
    }

    return this.repository.create({
      ...data,
      code: normalizedCode,
      created_by: userData.user.id,
    });
  }

  /**
   * Met à jour une invitation avec validation métier
   */
  async updateInvitation(id: string, updates: InvitationUpdate): Promise<FleetInvitation> {
    if (!id) {
      throw new Error('L\'ID de l\'invitation est requis');
    }

    // Validation de la date d'expiration si fournie
    if (updates.expires_at) {
      const expiresAt = new Date(updates.expires_at);
      if (isNaN(expiresAt.getTime())) {
        throw new Error('Date d\'expiration invalide');
      }
    }

    // Validation du nombre maximum d'utilisations
    if (updates.max_uses !== undefined && updates.max_uses !== null) {
      if (updates.max_uses < 1) {
        throw new Error('Le nombre maximum d\'utilisations doit être supérieur à 0');
      }
    }

    return this.repository.update(id, updates);
  }

  /**
   * Supprime une invitation avec validation métier
   */
  async deleteInvitation(id: string): Promise<void> {
    if (!id) {
      throw new Error('L\'ID de l\'invitation est requis');
    }

    const invitation = await this.repository.findById(id);
    if (!invitation) {
      throw new Error('Invitation introuvable');
    }

    return this.repository.delete(id);
  }

  /**
   * Incrémente le compteur d'utilisation d'une invitation
   */
  async incrementUses(id: string): Promise<void> {
    if (!id) {
      throw new Error('L\'ID de l\'invitation est requis');
    }

    const invitation = await this.repository.findById(id);
    if (!invitation) {
      throw new Error('Invitation introuvable');
    }

    // Vérifier si l'invitation a atteint son maximum d'utilisations
    if (invitation.max_uses !== null && invitation.current_uses >= invitation.max_uses) {
      throw new Error('Cette invitation a atteint son nombre maximum d\'utilisations');
    }

    // Vérifier si l'invitation a expiré
    if (invitation.expires_at) {
      const expiresAt = new Date(invitation.expires_at);
      if (expiresAt < new Date()) {
        throw new Error('Cette invitation a expiré');
      }
    }

    await this.repository.incrementUses(id);
  }

  /**
   * Accepte une invitation par code (RPC accepter_invitation).
   */
  async acceptInvitation(code: string): Promise<AcceptInvitationResult> {
    try {
      const { data, error } = await this.repository.acceptInvitationRpc(code);
      if (error) {
        console.error('Error accepting invitation:', error);
        return { ok: false, error: error.message };
      }
      const result = normalizeRpcResult(data);
      if (result) return result;
      return { ok: false, error: 'invalid_response' };
    } catch (err) {
      console.error('Exception accepting invitation:', err);
      return { ok: false, error: 'unexpected_error' };
    }
  }

  /**
   * Retourne le code d'invitation en attente si l'utilisateur a les métadonnées et n'a pas encore d'adhésion.
   */
  async checkPendingInvitation(
    userId: string,
    metadata: { invitation_code?: string; invitation_fleet_id?: string }
  ): Promise<string | null> {
    const invitationCode = metadata?.invitation_code;
    const invitationFleetId = metadata?.invitation_fleet_id;
    if (!invitationCode || !invitationFleetId) return null;
    const membership = await this.fleetMemberRepository.findActiveMembershipByUserAndFleet(
      userId,
      invitationFleetId
    );
    return membership ? null : invitationCode;
  }
}
