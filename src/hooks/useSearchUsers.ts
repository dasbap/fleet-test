import { useQuery } from '@tanstack/react-query';
import { UserSearchService } from '@/services/user-search.service';
import { UserSearchRepository } from '@/repositories/user-search.repository';

const userSearchRepository = new UserSearchRepository();
const userSearchService = new UserSearchService(userSearchRepository);

export interface SearchedUser {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface SearchUsersOptions {
  searchTerm: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook pour rechercher des utilisateurs par email ou nom (délègue au service).
 */
export function useSearchUsers(options: SearchUsersOptions) {
  const { searchTerm, limit = 20, enabled = true } = options;

  return useQuery<SearchedUser[], Error>({
    queryKey: ['search-users', searchTerm, limit],
    queryFn: () => userSearchService.searchUsers(searchTerm.trim(), limit),
    enabled: enabled && !!searchTerm && searchTerm.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
