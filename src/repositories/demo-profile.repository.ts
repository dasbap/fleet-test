import { supabase } from "@/integrations/supabase/client";

export type DemoProfileAccountType = "investor" | "prospect" | "internal" | "dev";

export interface DemoProfileRow {
  user_id: string;
  email: string;
  account_type: DemoProfileAccountType;
  is_active: boolean;
  expires_at: string | null;
  notified_at: string | null;
  deactivated_at: string | null;
  created_at: string;
}

export interface DemoProfileActionResult {
  ok: boolean;
  expires_at?: string;
}

/**
 * Accès RPC aux profils démo (panel admin legacy).
 */
export class DemoProfileRepository {
  async listProfiles(): Promise<DemoProfileRow[]> {
    const { data, error } = await supabase.rpc("list_demo_profiles");

    if (error) {
      console.error("Erreur list_demo_profiles:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as DemoProfileRow[];
  }

  async reactivateAccount(
    userId: string,
    adminId: string,
    extendHours?: number | null,
  ): Promise<DemoProfileActionResult> {
    const { data, error } = await supabase.rpc("reactivate_demo_account", {
      p_user_id: userId,
      p_reactivated_by: adminId,
      p_extend_hours: extendHours ?? null,
    });

    if (error) {
      console.error("Erreur reactivate_demo_account:", error);
      throw new Error(error.message);
    }

    return (data ?? { ok: false }) as DemoProfileActionResult;
  }

  async deactivateAccount(userId: string, adminId: string, reason: string): Promise<DemoProfileActionResult> {
    const { data, error } = await supabase.rpc("deactivate_demo_account", {
      p_user_id: userId,
      p_deactivated_by: adminId,
      p_reason: reason,
    });

    if (error) {
      console.error("Erreur deactivate_demo_account:", error);
      throw new Error(error.message);
    }

    return (data ?? { ok: false }) as DemoProfileActionResult;
  }
}
