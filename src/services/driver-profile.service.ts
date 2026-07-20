import { z } from 'zod';
import {
  DriverProfileRepository,
  type DriverProfile,
  type DriverProfileUpdate,
} from '@/repositories/driver-profile.repository';

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{7,20}$/, 'Numéro de téléphone invalide.')
  .optional()
  .nullable();

const driverProfileUpdateSchema = z.object({
  full_name: z.string().trim().min(2, 'Nom complet requis.').max(120).optional().nullable(),
  phone: phoneSchema,
  employee_code: z.string().trim().min(2).max(40).optional().nullable(),
  hire_date: z.string().date().optional().nullable(),
  contract_type: z.enum(['cdi', 'cdd', 'interim', 'consultant', 'other']).optional().nullable(),
  employment_status: z.enum(['active', 'suspended', 'inactive']).optional().nullable(),
  emergency_contact_name: z.string().trim().min(2).max(120).optional().nullable(),
  emergency_contact_phone: phoneSchema,
  rh_notes: z.string().trim().max(1000).optional().nullable(),
});

export class DriverProfileService {
  constructor(private repository: DriverProfileRepository) {}

  async getDriverProfile(driverUserId: string, fleetId: string): Promise<DriverProfile | null> {
    if (!driverUserId || !fleetId) {
      return null;
    }
    return this.repository.findByDriverAndFleet(driverUserId, fleetId);
  }

  async updateDriverProfile(driverUserId: string, input: DriverProfileUpdate): Promise<DriverProfile> {
    if (!driverUserId) {
      throw new Error('Identifiant conducteur requis.');
    }

    const parsed = driverProfileUpdateSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Données profil invalides.';
      throw new Error(message);
    }

    return this.repository.updateByDriverId(driverUserId, parsed.data);
  }
}
