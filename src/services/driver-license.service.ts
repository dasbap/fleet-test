import { z } from 'zod';
import {
  DriverLicenseRepository,
  type DriverLicense,
  type DriverLicenseInsert,
  type DriverLicenseUpdate,
} from '@/repositories/driver-license.repository';

const dateSchema = z.string().date().optional().nullable();

const driverLicenseInsertSchema = z.object({
  fleet_id: z.string().uuid('Flotte invalide.'),
  driver_user_id: z.string().uuid('Conducteur invalide.'),
  license_number: z.string().trim().min(3, 'Numéro de permis requis.').max(64),
  license_category: z.string().trim().min(1, 'Catégorie de permis requise.').max(24),
  issued_at: dateSchema,
  expires_at: dateSchema,
  issuing_country: z.string().trim().min(2).max(3).default('CM'),
  document_url: z.string().trim().url().optional().nullable(),
});

const driverLicenseUpdateSchema = z.object({
  license_number: z.string().trim().min(3).max(64).optional(),
  license_category: z.string().trim().min(1).max(24).optional(),
  issued_at: dateSchema,
  expires_at: dateSchema,
  issuing_country: z.string().trim().min(2).max(3).optional(),
  verification_status: z.enum(['pending', 'verified', 'rejected', 'expired']).optional(),
  document_url: z.string().trim().url().optional().nullable(),
});

function validateChronology(issuedAt?: string | null, expiresAt?: string | null): void {
  if (!issuedAt || !expiresAt) return;
  if (new Date(expiresAt).getTime() < new Date(issuedAt).getTime()) {
    throw new Error("La date d'expiration du permis doit être postérieure à la date d'émission.");
  }
}

export class DriverLicenseService {
  constructor(private repository: DriverLicenseRepository) {}

  async getDriverLicenses(driverUserId: string, fleetId: string): Promise<DriverLicense[]> {
    if (!driverUserId || !fleetId) return [];
    return this.repository.findByDriverAndFleet(driverUserId, fleetId);
  }

  async createDriverLicense(input: DriverLicenseInsert): Promise<DriverLicense> {
    const parsed = driverLicenseInsertSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Données permis invalides.';
      throw new Error(message);
    }

    validateChronology(parsed.data.issued_at, parsed.data.expires_at);
    return this.repository.create(parsed.data);
  }

  async updateDriverLicense(id: string, updates: DriverLicenseUpdate): Promise<DriverLicense> {
    if (!id) {
      throw new Error('Identifiant du permis requis.');
    }
    const parsed = driverLicenseUpdateSchema.safeParse(updates);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Mise à jour du permis invalide.';
      throw new Error(message);
    }

    validateChronology(parsed.data.issued_at, parsed.data.expires_at);
    return this.repository.update(id, parsed.data);
  }

  async deleteDriverLicense(id: string): Promise<void> {
    if (!id) {
      throw new Error('Identifiant du permis requis.');
    }
    await this.repository.delete(id);
  }
}
