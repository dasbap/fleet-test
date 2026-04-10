import { describe, expect, it, vi } from 'vitest';
import { OnboardingService } from '@/services/onboarding.service';
import type { OnboardingRepository } from '@/repositories/onboarding.repository';
import type { OnboardingProgress, OnboardingStep1Data } from '@/types/onboarding';

function createRepositoryMock() {
  return {
    findByOrgId: vi.fn(),
    getAuthenticatedUserId: vi.fn(),
    upsertProgress: vi.fn(),
    markCompleted: vi.fn(),
    findFleetIdByOrgId: vi.fn(),
    findFirstVehicleByFleetId: vi.fn(),
    createVehicleForFleet: vi.fn(),
  };
}

const step1Data: OnboardingStep1Data = {
  plate: 'AB 123 CD',
  brand: 'Toyota',
  model: 'Hilux',
  km: 45000,
  type: 'pickup',
};

describe('OnboardingService', () => {
  it('refuse une plaque vide pour saveStep1', async () => {
    const repo = createRepositoryMock();
    const svc = new OnboardingService(repo as unknown as OnboardingRepository);

    await expect(
      svc.saveStep1('org-1', {
        ...step1Data,
        plate: ' ',
      }),
    ).rejects.toThrow("La plaque d'immatriculation est requise.");
  });

  it('fusionne les données step par step dans saveStep', async () => {
    const repo = createRepositoryMock();
    repo.findByOrgId = vi
      .fn<OnboardingRepository['findByOrgId']>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'progress-1',
        org_id: 'org-1',
        user_id: 'user-1',
        step: 1,
        completed: false,
        data: { step1: step1Data },
      } satisfies OnboardingProgress);
    repo.getAuthenticatedUserId = vi.fn<OnboardingRepository['getAuthenticatedUserId']>().mockResolvedValue('user-1');
    repo.upsertProgress = vi.fn<OnboardingRepository['upsertProgress']>().mockImplementation(async (payload) => payload);

    const svc = new OnboardingService(repo as unknown as OnboardingRepository);

    await svc.saveStep('org-1', 1, { step1: step1Data });
    await svc.saveStep('org-1', 2, { step2: { alerts: { oil: true, revision: false, tires: true, brakes: true } } });

    expect(repo.upsertProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        org_id: 'org-1',
        step: 2,
        data: expect.objectContaining({
          step1: step1Data,
          step2: { alerts: { oil: true, revision: false, tires: true, brakes: true } },
        }),
      }),
    );
  });

  it('crée le premier véhicule si la flotte est vide', async () => {
    const repo = createRepositoryMock();
    repo.findFleetIdByOrgId = vi.fn<OnboardingRepository['findFleetIdByOrgId']>().mockResolvedValue('fleet-1');
    repo.findFirstVehicleByFleetId = vi.fn<OnboardingRepository['findFirstVehicleByFleetId']>().mockResolvedValue(null);
    repo.createVehicleForFleet = vi.fn<OnboardingRepository['createVehicleForFleet']>().mockResolvedValue({
      id: 'veh-1',
      fleet_id: 'fleet-1',
      registration: 'AB 123 CD',
      brand: 'Toyota',
      model: 'Hilux',
      year: null,
      current_km: 45000,
      status: 'ok',
      blocked_reason: null,
      created_at: '2026-04-10T00:00:00Z',
    });

    const svc = new OnboardingService(repo as unknown as OnboardingRepository);

    await svc.createFirstVehicleForOrg('org-1', step1Data);

    expect(repo.createVehicleForFleet).toHaveBeenCalledWith({
      fleet_id: 'fleet-1',
      registration: 'AB 123 CD',
      brand: 'Toyota',
      model: 'Hilux',
      current_km: 45000,
    });
  });

  it("n'en crée pas un second si un véhicule existe déjà", async () => {
    const repo = createRepositoryMock();
    repo.findFleetIdByOrgId = vi.fn<OnboardingRepository['findFleetIdByOrgId']>().mockResolvedValue('fleet-1');
    repo.findFirstVehicleByFleetId = vi.fn<OnboardingRepository['findFirstVehicleByFleetId']>().mockResolvedValue({
      id: 'veh-existing',
      fleet_id: 'fleet-1',
      registration: 'EX 111 ST',
      brand: 'Isuzu',
      model: 'D-Max',
      year: null,
      current_km: 12000,
      status: 'ok',
      blocked_reason: null,
      created_at: '2026-04-10T00:00:00Z',
    });
    repo.createVehicleForFleet = vi.fn<OnboardingRepository['createVehicleForFleet']>();

    const svc = new OnboardingService(repo as unknown as OnboardingRepository);
    const result = await svc.createFirstVehicleForOrg('org-1', step1Data);

    expect(result?.id).toBe('veh-existing');
    expect(repo.createVehicleForFleet).not.toHaveBeenCalled();
  });
});
