import { describe, expect, it, vi } from 'vitest';
import { DriverLicenseService } from '@/services/driver-license.service';

describe('driver-license.service', () => {
  it('refuse une chronologie invalide de permis', async () => {
    const repository = {
      findByDriverAndFleet: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    const service = new DriverLicenseService(repository as never);

    await expect(
      service.createDriverLicense({
        fleet_id: '550e8400-e29b-41d4-a716-446655440000',
        driver_user_id: '550e8400-e29b-41d4-a716-446655440001',
        license_number: 'CM-2024-001',
        license_category: 'B',
        issued_at: '2026-04-10',
        expires_at: '2026-04-01',
      }),
    ).rejects.toThrow("La date d'expiration du permis doit être postérieure à la date d'émission.");
  });

  it('crée un permis valide', async () => {
    const repository = {
      findByDriverAndFleet: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'license-id' }),
      update: vi.fn(),
      delete: vi.fn(),
    };
    const service = new DriverLicenseService(repository as never);

    await service.createDriverLicense({
      fleet_id: '550e8400-e29b-41d4-a716-446655440000',
      driver_user_id: '550e8400-e29b-41d4-a716-446655440001',
      license_number: 'CM-2024-001',
      license_category: 'B',
      issued_at: '2026-01-01',
      expires_at: '2028-01-01',
      issuing_country: 'CM',
    });

    expect(repository.create).toHaveBeenCalled();
  });
});
