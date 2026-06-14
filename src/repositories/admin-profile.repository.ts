import { supabase } from "@/integrations/supabase/client";

export interface AdminProfileRow {
  user_id: string;
  is_active: boolean;
}

/**
 * Accès table admin_profiles (statut admin plateforme).
 */
export class AdminProfileRepository {
  async findActiveByUserId(userId: string): Promise<AdminProfileRow | null> {
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("user_id, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Erreur admin_profiles:", error);
      throw new Error(error.message);
    }

    return (data as AdminProfileRow | null) ?? null;
  }
}
