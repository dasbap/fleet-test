import { supabase } from '@/integrations/supabase/client';

export interface SearchedUserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export class UserSearchRepository {
  async search(term: string, limit: number): Promise<SearchedUserRow[]> {
    const { data, error } = await supabase.rpc('rechercher_utilisateurs', {
      p_terme_recherche: term.trim(),
      p_limite: limit,
    });

    if (error) {
      console.error('Error searching users:', error);
      throw new Error(error.message);
    }
    return (data || []) as SearchedUserRow[];
  }
}
