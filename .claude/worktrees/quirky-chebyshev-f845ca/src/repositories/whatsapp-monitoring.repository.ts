import { supabase } from "@/integrations/supabase/client";

export interface WhatsappMonitoringStats {
  total24h: number;
  failed24h: number;
  retryScheduled: number;
  successRate24h: number;
}

export interface WhatsappFailureItem {
  id: string;
  createdAt: string;
  templateName: string;
  phoneE164: string;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
}

export class WhatsappMonitoringRepository {
  async getStats(fleetId: string): Promise<WhatsappMonitoringStats> {
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("whatsapp_outbound_logs")
      .select("status")
      .eq("fleet_id", fleetId)
      .gte("created_at", sinceIso);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    const total = rows.length;
    const failed = rows.filter((row) => row.status === "failed").length;
    const retryScheduled = rows.filter((row) => row.status === "retry_scheduled").length;
    const success = rows.filter(
      (row) => row.status === "sent" || row.status === "delivered" || row.status === "read",
    ).length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    return {
      total24h: total,
      failed24h: failed,
      retryScheduled,
      successRate24h: successRate,
    };
  }

  async getRecentFailures(fleetId: string): Promise<WhatsappFailureItem[]> {
    const { data, error } = await supabase
      .from("whatsapp_outbound_logs")
      .select(
        "id, created_at, template_name, phone_e164, error_message, retry_count, max_retries, next_retry_at",
      )
      .eq("fleet_id", fleetId)
      .in("status", ["failed", "retry_scheduled"])
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      templateName: row.template_name,
      phoneE164: row.phone_e164,
      errorMessage: row.error_message,
      retryCount: row.retry_count ?? 0,
      maxRetries: row.max_retries ?? 3,
      nextRetryAt: row.next_retry_at,
    }));
  }
}
