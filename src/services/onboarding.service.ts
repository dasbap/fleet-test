import type { OnboardingData, OnboardingProgress, OnboardingStep1Data } from '@/types/onboarding';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import type { VehicleDto } from '@/types/dto/vehicle.dto';

export class OnboardingService {
  constructor(private repository: OnboardingRepository) {}

  async getProgress(orgId: string): Promise<OnboardingProgress | null> {
    if (!orgId) {
      throw new Error("L'identifiant d'organisation est requis.");
    }

    return this.repository.findByOrgId(orgId);
  }

  async saveStep(
    orgId: string,
    step: 1 | 2 | 3 | 4,
    patch: Partial<OnboardingData>,
    completed = false,
  ): Promise<OnboardingProgress> {
    if (!orgId) {
      throw new Error("L'identifiant d'organisation est requis.");
    }

    const userId = await this.repository.getAuthenticatedUserId();
    const current = await this.repository.findByOrgId(orgId);
    const nextData: OnboardingData = {
      ...(current?.steps_data ?? {}),
      ...patch,
    };

    return this.repository.upsertProgress({
      org_id: orgId,
      user_id: userId,
      step,
      completed,
      steps_data: nextData,
      updated_at: new Date().toISOString(),
    });
  }

  async saveStep1(orgId: string, data: OnboardingStep1Data): Promise<OnboardingProgress> {
    this.validateStep1(data);
    return this.saveStep(orgId, 1, { step1: data }, false);
  }

  async createFirstVehicleForOrg(orgId: string, data: OnboardingStep1Data): Promise<VehicleDto | null> {
    if (!orgId) {
      throw new Error("L'identifiant d'organisation est requis.");
    }
    this.validateStep1(data);

    const fleetId = await this.repository.findFleetIdByOrgId(orgId);
    if (!fleetId) {
      throw new Error("Aucune flotte n'est associée à cette organisation.");
    }

    const existingVehicle = await this.repository.findFirstVehicleByFleetId(fleetId);
    if (existingVehicle) {
      return existingVehicle;
    }

    return this.repository.createVehicleForFleet({
      fleet_id: fleetId,
      registration: data.plate.toUpperCase().trim().replace(/\s+/g, ' '),
      brand: data.brand.trim(),
      model: data.model.trim(),
      current_km: data.km,
    });
  }

  async markCompleted(orgId: string): Promise<void> {
    if (!orgId) {
      throw new Error("L'identifiant d'organisation est requis.");
    }
    await this.repository.markCompleted(orgId);
  }

  private validateStep1(data: OnboardingStep1Data): void {
    if (!data.plate?.trim()) {
      throw new Error("La plaque d'immatriculation est requise.");
    }
    if (!data.brand?.trim()) {
      throw new Error('La marque est requise.');
    }
    if (!data.type) {
      throw new Error('Le type de véhicule est requis.');
    }
    if (data.km < 0) {
      throw new Error('Le kilométrage ne peut pas être négatif.');
   