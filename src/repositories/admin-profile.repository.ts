import { supabase } from "@/integrations/supabase/client";

export interface AdminProfileRow {
  user_id: string;
  is_active: boolean;
  is_super_admin: boolean;
}

/**
 * Statut admin plateforme cote client.
 *
 * Le schema runtime actuel n'expose pas `admin_profiles` au client. Les routes
 * sensibles gardent leurs controles serveur/RPC, et l'UI traite donc
 * l'utilisateur comme non-admin plateforme quand cette table n'est pas
 * disponible.
 */
export class AdminProfileRepository {
  async findActiveByUserId(userId: string): Promise<AdminProfileRow | null> {
    if (!userId) return null;

    const { data, error } = await supabase.rpc("is_platform_admin");

    if (error) {
      throw new Error(error.message);
    }

    return data === true ? { user_id: userId, is_active: true, is_super_admin: false } : null;
  }

  async isPlatformSuperAdmin(userId: string): Promise<boolean> {
    if (!userId) return false;

    const { data, error } = await supabase.rpc("is_platform_super_admin");

    if (error) {
      throw new Error(error.message);
    }

    return data === true;
  }
}
