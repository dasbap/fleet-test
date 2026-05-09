import {
  ESAMBA_DEMO_COLLECTION_POLICY,
  ESAMBA_DEMO_FLEET_MEMBER_ROLE,
  ESAMBA_DEMO_FLEET_NAME,
  ESAMBA_DEMO_INVITATION_CODE,
  ESAMBA_DEMO_ORG_COUNTRY_CODE,
  ESAMBA_DEMO_ORG_NAME,
  ESAMBA_DEMO_VEHICLE_KM,
  ESAMBA_DEMO_VEHICLE_MAKE,
  ESAMBA_DEMO_VEHICLE_MODEL,
  ESAMBA_DEMO_VEHICLE_REGISTRATION,
  ESAMBA_DEMO_VEHICLE_YEAR,
} from '@/constants/esamba-demo.constants';
import { EsambaSetupRepository } from '@/repositories/esamba-setup.repository';
import type { CreateFleetParams } from '@/types/create-fleet';

export type { CreateFleetParams };

export interface SeedResult {
  orgId: string;
  fleetId: string;
  vehicleId: string;
  invitationCode: string;
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
    const orgName = ESAMBA_DEMO_ORG_NAME;
    let orgId = await this.repository.findOrganisationIdByName(orgName);
    if (!orgId) {
      orgId = await this.repository.createOrganisation(orgName, ESAMBA_DEMO_ORG_COUNTRY_CODE);
    }

    const fleetId = await this.repository.creerFlotteEsamba(
      orgId,
      ESAMBA_DEMO_FLEET_NAME,
      ESAMBA_DEMO_COLLECTION_POLICY
    );

    await this.repository.creerOuMettreAJourAdhesionFlotte(
      fleetId,
      userId,
      ESAMBA_DEMO_FLEET_MEMBER_ROLE,
      true
    );

    const vehicleId = await this.repository.creerVehiculeEsamba(
      fleetId,
      ESAMBA_DEMO_VEHICLE_REGISTRATION,
      ESAMBA_DEMO_VEHICLE_MAKE,
      ESAMBA_DEMO_VEHICLE_MODEL,
      ESAMBA_DEMO_VEHICLE_YEAR,
      ESAMBA_DEMO_VEHICLE_KM
    );

    const invitationCode = await this.repository.creerInvitationEsamba(
      fleetId,
      ESAMBA_DEMO_INVITATION_CODE
    );

    return { orgId, fleetId, vehicleId, invitationCode };
  }

  /**
   * Onboarding : organisation + flotte + adhésion organizer (RPC atomique côté base).
   */
  async createFleetAndJoin(params: CreateFleetParams): Promise<{ orgId: string; fleetId: string }> {
    return this.repository.creerOnboardingOrganisationFlotteEtAdhesion(params);
  }
}
