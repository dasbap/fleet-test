import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/auth";

export interface TenantMembershipRow {
  fleet_id: string;
  role: AppRole;
  is_active: boolean;
  flottes: {
    org_id: string;
    name: string;
  } | null;
}

export class TenantAccessRepository {
  async getActiveMemberships(userId: string): Promise<TenantMembershipRow[]> {
    const { data, error } = await supabase
      .from("flotte_adhesions")
      .select("fleet_id, role, is_active, flottes(org_id, name)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      console.error("Erreur de lecture des adhésions tenant :", error);
      throw new Error(error.message);
    }

    return (data ?? []) as TenantMembershipRow[];
  }
}
