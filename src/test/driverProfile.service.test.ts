import { describe, expect, it, vi } from 'vitest';
import { DriverProfileService } from '@/services/driver-profile.service';

describe('driver-profile.service', () => {
  it('retourne null si identifiants manquants', async () => {
    const repository = {
      findByDriverAndFleet: vi.fn(),
      updateByDriverId: vi.fn(),
    };
    const service = new DriverProfileService(repository as never);

    await expect(service.getDriverProfile('', 'fleet-id')).resolves.toBeNull();
    expect(repository.findByDriverAndFleet).not.toHaveBeenCalled();
  });

  it('valide les données RH avant mise à jour', async () => {
    const repository = {
      findByDriverAndFleet: vi.fn(),
      updateByDriverId: vi.fn(),
    };
    const service = new DriverProfileService(repository as never);

    await expect(
      service.updateDriverProfile('driver-id', {
        phone: '++invalid',
      }),
    ).rejects.toThrow('Numéro de téléphone invalide.');
  });

  it('normalise la mise à jour valide', async () => {
    const repository = {
      findByDriverAndFleet: vi.fn(),
      updateByDriverId: vi.fn().mockResolvedValue({
        user_id: 'driver-id',
      }),
    };
    const service = new DriverProfileService(repository as never);

    await service.updateDriverProfile('driver-id', {
      full_name: '  Conducteur Test  ',
    });

    expect(repository.updateByDriverId).toHaveBeenCalledWith('driver-id', {
      full_name: 'Conducteur Test',
    });
  });
});
