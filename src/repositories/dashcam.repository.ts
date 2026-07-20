import { supabase } from "@/integrations/supabase/client";

export interface DashcamRow {
  id: string;
  fleet_id: string;
  vehicle_id: string | null;
  name: string;
  brand: string;
  channel?: number | null;
  stream_url: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  firmware_ver: string | null;
  created_at: string;
}

export interface DashcamAlertRow {
  id: string;
  dashcam_id: string;
  fleet_id: string;
  vehicle_id: string | null;
  driver_user_id: string | null;
  alert_type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  snapshot_url: string | null;
  video_clip_url: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  speed_kmh: number | null;
  ai_provider: string;
  acknowledged: boolean;
  ack_at: string | null;
  created_at: string;
}

export interface RegisterDashcamInput {
  fleet_id: string;
  vehicle_id?: string;
  name: string;
  brand: string;
  stream_url?: string;
}

export interface DashcamAiAlertPayload {
  dashcam_id: string;
  event_type: string;
  confidence?: number;
  snapshot_url?: string;
  gps?: { lat: number; lon: number };
  speed_kmh?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Accès Supabase dashcams + edge function IA.
 */
export class DashcamRepository {
  async findByFleet(fleetId: string): Promise<DashcamRow[]> {
    const { data, error } = await supabase
      .from("dashcams")
      .select("*")
      .eq("fleet_id", fleetId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement dashcams:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as DashcamRow[];
  }

  async findAlertsByFleet(fleetId: string, limit: number): Promise<DashcamAlertRow[]> {
    const { data, error } = await supabase
      .from("dashcam_alerts")
      .select("*")
      .eq("fleet_id", fleetId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erreur chargement alertes dashcam:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as DashcamAlertRow[];
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from("dashcam_alerts")
      .update({ acknowledged: true, ack_at: new Date().toISOString() })
      .eq("id", alertId);

    if (error) {
      console.error("Erreur acquittement alerte dashcam:", error);
      throw new Error(error.message);
    }
  }

  async register(input: RegisterDashcamInput): Promise<DashcamRow> {
    const { data, error } = await supabase
      .from("dashcams")
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error("Erreur enregistrement dashcam:", error);
      throw new Error(error.message);
    }

    return data as DashcamRow;
  }

  async sendAiAlerts(
    alerts: DashcamAiAlertPayload[],
  ): Promise<{ processed: number; inserted: number }> {
    const { data, error } = await supabase.functions.invoke("dashcam-ai-webhook", {
      body: { alerts },
    });

    if (error) {
      console.error("Erreur dashcam-ai-webhook:", error);
      throw new Error(error.message);
    }

    return (data ?? { processed: 0, inserted: 0 }) as { processed: number; inserted: number };
  }
}
