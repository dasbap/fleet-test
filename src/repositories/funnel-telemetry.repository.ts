import { supabase } from "@/integrations/supabase/client";
import type { FunnelEventInput, FunnelMetrics } from "@/types/funnel-telemetry";

/**
 * Appels RPC Supabase alignés sur la migration `20260410190000_funnel_telemetry.sql` :
 * - `track_funnel_event(p_org_id, p_event_type, p_step, p_status, p_context, p_occurred_at)`
 * - `get_funnel_metrics(p_org_id, p_days)` → jsonb
 */
export class FunnelTelemetryRepository {
  async trackEvent(orgId: string, input: FunnelEventInput): Promise<void> {
    const { error } = await supabase.rpc("track_funnel_event", {
      p_org_id: orgId,
      p_event_type: input.eventType,
      p_step: input.step ?? null,
      p_status: input.status ?? null,
      p_context: input.context ?? {},
      p_occurred_at: input.occurredAt ?? new Date().toISOString(),
    });

    if (error) {
      console.error("Erreur lors de l'enregistrement de la télémétrie funnel :", error);
      throw new Error(error.message);
    }
  }

  async getMetrics(orgId: string, windowDays = 30): Promise<FunnelMetrics | null> {
    const { data, error } = await supabase.rpc("get_funnel_metrics", {
      p_org_id: orgId,
      p_days: windowDays,
    });

    if (error) {
      console.error("Erreur lors de la lecture des métriques funnel :", error);
      throw new Error(error.message);
    }

    return (data ?? null) as FunnelMetrics | null;
  }
}

