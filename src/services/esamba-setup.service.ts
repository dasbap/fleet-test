import { EsambaSetupRepository } from '@/repositories/esamba-setup.repository';

export interface SeedResult {
  orgId: string;
  fleetId: string;
  vehicleId: string;
  invitationCode: string;
}

export interface CreateFleetParams {
  orgName: string;
  fleetName: string;
  collectionPolicy: string;
  countryCode: string;
}

/**
 * Service pour le setup ESAMBA : seed des données de démo et création de flotte.
 * Orchestre le repository (pas d'appel Supabase direct).
 */
export class EsambaSetupService {
  constructor(private repository: EsambaSetupRepository) {}

  /**
   * Crée ou réutilise l'organisation, la flotte ESAMBA, le véhicule de démo et l'invitation.
   */
  async seedEsambaData(userId: string): Promise<SeedResult> {
    const orgName = 'Organisation ESAMBA';
    let orgId = await this.repository.findOrganisationIdByName(orgName);
    if (!orgId) {
      orgId = await this.repository.createOrganisation(orgName, 'CM');
    }

    const fleetId = await this.repository.creerFlotteEsamba(orgId, 'Flotte ESAMBA', 'mix');

    await this.repository.creerOuMettreAJourAdhesionFlotte(fleetId, userId, 'organizer', true);

    const vehicleId = await this.repository.creerVehiculeEsamba(
      fleetId,
      'ESAMBA-001',
      'Toyota',
      'Corolla',
      2020,
      0
    );

    const invitationCode = await this.repository.creerInvitationEsamba(fleetId, 'ESAMBA-2024');

    return { orgId, fleetId, vehicleId, invitationCode };
  }

  /**
   * Crée une organisation (ou réutilise), une flotte et ajoute l'utilisateur comme organizer.
   */
  async createFleetAndJoin(
    userId: string,
    params: CreateFleetParams
  ): Promise<{ orgId: string; fleetId: string }> {
    let orgId = await this.repository.findOrganisationIdByName(params.orgName);
    if (!orgId) {
      orgId = await this.repository.createOrganisation(params.orgName, params.countryCode);
    }

    const fleetId = await this.repository.creerFlotteEsamba(
      orgId,
      params.fleetName,
      params.collectionPolicy
    );

    await this.repository.creerOuMettreAJourAdhesionFlotte(fleetId, userId, 'organizer', true);

    return { orgId, fleetId };
  }
}
