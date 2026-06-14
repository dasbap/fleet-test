import { supabase } from "@/integrations/supabase/client";

export type DemoAccountType = "prospect" | "investor" | "internal" | "dev";
export type DemoRole = "driver" | "manager" | "mechanic" | "organizer";

export interface DemoSession {
  user_id: string;
  email: string;
  account_type: DemoAccountType;
  demo_role: DemoRole | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  deactivated_at: string | null;
  last_login: string | null;
  notes: string | null;
  fleet_id: string | null;
  fleet_name: string | null;
  magic_link_token: string | null;
  magic_link_label: string | null;
  used_count: number;
  last_used_at: string | null;
  link_expires_at: string | null;
  onboarding_steps: number;
  last_activity_at: string | null;
}

export interface DemoFleet {
  id: string;
  name: string;
}

export interface DemoRpcActionResult {
  ok: boolean;
  expires_at?: string;
  vehicles_deleted?: number;
}

/**
 * Accès Supabase pour l'administration des comptes démo (RPC + flottes).
 */
export class AdminDemoRepository {
  async listSessions(activeOnly = false): Promise<DemoSession[]> {
    const { data, error } = await supabase.rpc("admin_list_demo_sessions", {
      p_active_only: activeOnly,
    });

    if (error) {
      console.error("Erreur admin_list_demo_sessions:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as DemoSession[];
  }

  async listDemoFleets(): Promise<DemoFleet[]> {
    const { data, error } = await supabase
      .from("flottes")
      .select("id, name")
      .eq("is_demo", true)
      .order("name");

    if (error) {
      console.error("Erreur chargement flottes démo:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as DemoFleet[];
  }

  async deactivateAccount(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<DemoRpcActionResult> {
    const { data, error } = await supabase.rpc("deactivate_demo_account", {
      p_user_id: userId,
      p_deactivated_by: adminId,
      p_reason: reason,
    });

    if (error) {
      console.error("Erreur deactivate_demo_account:", error);
      throw new Error(error.message);
    }

    return (data ?? { ok: false }) as DemoRpcActionResult;
  }

  async reactivateAccount(
    userId: string,
    adminId: string,
    extendHours?: number | null,
  ): Promise<DemoRpcActionResult> {
    const { data, error } = await supabase.rpc("reactivate_demo_account", {
      p_user_id: userId,
      p_reactivated_by: adminId,
      p_extend_hours: extendHours ?? null,
    });

    if (error) {
      console.error("Erreur reactivate_demo_account:", error);
      throw new Error(error.message);
    }

    return (data ?? { ok: false }) as DemoRpcActionResult;
  }

  async resetDemoFleet(fleetId: string): Promise<DemoRpcActionResult> {
    const { data, error } = await supabase.rpc("admin_reset_demo_fleet", {
      p_fleet_id: fleetId,
    });

    if (error) {
      console.error("Erreur admin_reset_demo_fleet:", error);
      throw new Error(error.message);
    }

    return (data ?? { ok: false }) as DemoRpcActionResult;
  }
}
