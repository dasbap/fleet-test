import { ProfileRepository } from '@/repositories/profile.repository';

export interface EnsureProfileResult {
  success: boolean;
  action?: 'created' | 'updated' | 'no_action';
  full_name?: string;
  error?: string;
}

export class ProfileService {
  constructor(private repository: ProfileRepository) {}

  async ensureProfile(userId: string): Promise<EnsureProfileResult | null> {
    const existing = await this.repository.findByUserId(userId);
    if (existing?.full_name) {
      return { success: true, action: 'no_action', full_name: existing.full_name ?? undefined };
    }
    try {
      const data = await this.repository.ensureProfileRpc();
      if (data?.success) {
        return {
          success: true,
          action: (data.action as 'created' | 'updated') ?? 'updated',
          full_name: data.full_name,
        };
      }
      return { success: false, error: 'Réponse invalide' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async updateProfileFullName(userId: string, fullName: string): Promise<void> {
    const normalized = fullName.trim();

    if (!userId) {
      throw new Error("L'identifiant utilisateur est requis");
    }

    if (normalized.length < 2) {
      throw new Error('Le nom doit contenir au moins 2 caractères');
    }

    if (normalized.length > 50) {
      throw new Error('Le nom ne doit pas dépasser 50 caractères');
    }

    await this.repository.updateAuthFullName(normalized);

    try {
      await this.repository.updateFullName(userId, normalized);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil (table profils) :', error);
    }
  }
}
