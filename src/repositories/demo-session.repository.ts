import { supabase } from "@/integrations/supabase/client";

export interface DemoUpsertSessionResult {
  ok: boolean;
  error?: string;
  session_id?: string;
  expires_at?: string;
  fleet_id?: string;
  demo_role?: string;
  policy?: Record<string, unknown>;
}

/**
 * Accès RPC session démo (demo_upsert_session).
 */
export class DemoSessionRepository {
  async upsertSession(userAgent?: string | null): Promise<DemoUpsertSessionResult> {
    const { data, error } = await supabase.rpc("demo_upsert_session", {
      p_ip_address: null,
      p_user_agent: userAgent ?? null,
    });

    if (error) {
      console.error("Erreur demo_upsert_session:", error);
      throw error;
    }

    return (data ?? { ok: false }) as DemoUpsertSessionResult;
  }
}
