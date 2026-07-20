import { UserSearchRepository } from '@/repositories/user-search.repository';
import type { SearchedUserRow } from '@/repositories/user-search.repository';

export class UserSearchService {
  constructor(private repository: UserSearchRepository) {}

  async searchUsers(term: string, limit: number = 20): Promise<SearchedUserRow[]> {
    if (!term || term.trim().length < 2) return [];
    try {
      return await this.repository.search(term, limit);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Permission denied') || message.includes('permission_denied')) {
        throw new Error('Vous n\'avez pas les droits nécessaires pour rechercher des utilisateurs.');
      }
      if (message.includes('authenticated')) {
        throw new Error('Vous devez être connecté pour rechercher des utilisateurs.');
      }
      throw new Error('Impossible de rechercher des utilisateurs.');
    }
  }
}
