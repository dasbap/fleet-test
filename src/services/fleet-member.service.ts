import { FleetMemberRepository } from '@/repositories/fleet-member.repository';
import type {
  FleetMember,
  FleetMemberInsert,
  FleetMemberUpdate,
  FleetMemberFilters,
  RoleType,
} from '@/repositories/fleet-member.repository';

/**
 * Service pour la logique métier des membres de flotte
 */
export class FleetMemberService {
  constructor(private repository: FleetMemberRepository) {}

  /**
   * Récupère les adhésions actives d'un utilisateur (pour useAuth / memberships).
   */
  async getActiveMembershipsForUser(userId: string): Promise<{ id: string; fleet_id: string; role: RoleType; is_active: boolean }[]> {
    if (!userId) {
      return [];
    }
    const members = await this.repository.findAll({ user_id: userId, is_active: true });
    return members.map((m) => ({
      id: m.id,
      fleet_id: m.fleet_id,
      role: m.role,
      is_active: m.is_active,
    }));
  }

  /**
   * Récupère tous les membres d'une flotte
   */
  async getFleetMembers(fleetId: string): Promise<FleetMember[]> {
    if (!fleetId) {
      return [];
    }

    return this.repository.findAll({ fleet_id: fleetId });
  }

  /**
   * Récupère tous les membres avec filtres
   */
  async getAllMembers(filters?: FleetMemberFilters): Promise<FleetMember[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Récupère un membre par son ID
   */
  async getMemberById(id: string): Promise<FleetMember | null> {
    if (!id) {
      throw new Error('L\'ID du membre est requis');
    }

    return this.repository.findById(id);
  }

  /**
   * Ajoute un membre à une flotte via son email.
   * @param phone Numéro E.164 optionnel (+237XXXXXXXXX) — mis à jour dans `profils` après création.
   */
  async addMemberByEmail(fleetId: string, email: string, role: RoleType, phone?: string): Promise<void> {
    // Validation métier
    if (!fleetId) {
      throw new Error('L\'ID de la flotte est requis');
    }

    if (!email || email.trim() === '') {
      throw new Error('L\'email est requis');
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Format d\'email invalide');
    }

    // Validation du rôle
    const validRoles: RoleType[] = ['organizer', 'manager', 'driver', 'mechanic'];
    if (!validRoles.includes(role)) {
      throw new Error('Rôle invalide');
    }

    try {
      const membershipId = await this.repository.addMemberByEmail(fleetId, email.trim().toLowerCase(), role);
      // Si un téléphone est fourni, mettre à jour le profil (non bloquant)
      if (phone && membershipId) {
        await this.repository.updateMemberPhone(membershipId, phone).catch(() => {
          // Intentionnellement silencieux : l'adhésion est créée, le téléphone peut être saisi plus tard
        });
      }
    } catch (error: unknown) {
      // Gestion explicite des erreurs avec des messages adaptés
      let errorMessage = "Impossible d'ajouter le membre à la flotte.";
      const msg = error instanceof Error ? error.message : '';

      if (msg.includes('User not found') || msg.includes('user_not_found')) {
        errorMessage = "Aucun utilisateur trouvé avec cet email. L'utilisateur doit d'abord créer un compte.";
      } else if (msg.includes('Permission denied') || msg.includes('permission_denied')) {
        errorMessage = "Vous n'avez pas les droits nécessaires pour ajouter un membre (manager ou organisateur requis).";
      } else if (msg.includes('Fleet not found') || msg.includes('fleet_not_found')) {
        errorMessage = 'Flotte introuvable. Veuillez rafraîchir la page ou vérifier l\'identifiant de la flotte.';
      } else if (msg.includes('duplicate key value') || msg.includes('already exists')) {
        errorMessage = "Cet utilisateur est déjà membre de la flotte avec ce rôle.";
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Met à jour le rôle d'un membre
   */
  async updateMemberRole(
    membershipId: string,
    fleetId: string,
    userId: string,
    role: RoleType
  ): Promise<void> {
    // Validation métier
    if (!membershipId) {
      throw new Error('L\'ID du membership est requis');
    }

    if (!fleetId) {
      throw new Error('L\'ID de la flotte est requis');
    }

    if (!userId) {
      throw new Error('L\'ID de l\'utilisateur est requis');
    }

    // Validation du rôle
    const validRoles: RoleType[] = ['organizer', 'manager', 'driver', 'mechanic'];
    if (!validRoles.includes(role)) {
      throw new Error('Rôle invalide');
    }

    await this.repository.upsertMembership(fleetId, userId, role, true);
  }

  /**
   * Retire un membre de l'équipe (désactivation)
   */
  async removeMember(membershipId: string, fleetId: string): Promise<void> {
    // Validation métier
    if (!membershipId) {
      throw new Error('L\'ID du membership est requis');
    }

    if (!fleetId) {
      throw new Error('L\'ID de la flotte est requis');
    }

    // Vérifier que le membre existe
    const member = await this.repository.findById(membershipId);
    if (!member) {
      throw new Error('Membre introuvable');
    }

    // Désactiver le membre
    await this.repository.deactivateMember(membershipId);
  }

  /**
   * Crée un nouveau membre de flotte
   */
  async createMember(data: FleetMemberInsert): Promise<FleetMember> {
    // Validation métier
    if (!data.fleet_id) {
      throw new Error('L\'ID de la flotte est requis');
    }

    if (!data.user_id) {
      throw new Error('L\'ID de l\'utilisateur est requis');
    }

    if (!data.role) {
      throw new Error('Le rôle est requis');
    }

    return this.repository.create(data);
  }

  /**
   * Met à jour un membre de flotte
   */
  async updateMember(id: string, updates: FleetMemberUpdate): Promise<FleetMember> {
    if (!id) {
      throw new Error('L\'ID du membre est requis');
    }

    return this.repository.update(id, updates);
  }

  /**
   * Supprime un membre de flotte
   */
  async deleteMember(id: string): Promise<void> {
    if (!id) {
      throw new Error('L\'ID du membre est requis');
    }

    await this.repository.delete(id);
  }
}
