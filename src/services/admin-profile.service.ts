import { AdminProfileRepository } from "@/repositories/admin-profile.repository";

/**
 * Logique métier profil admin plateforme.
 */
export class AdminProfileService {
  constructor(private repository: AdminProfileRepository) {}

  async isPlatformAdmin(userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }

    try {
      const profile = await this.repository.findActiveByUserId(userId);
      return profile !== null;
    } catch {
      // Table absente ou RLS → non-admin
      return false;
    }
  }
}
