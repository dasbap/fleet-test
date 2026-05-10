import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Dashcam {
  id: string;
  fleet_id: string;
  vehicle_id: string | null;
  name: string;
  brand: string;
  stream_url: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  firmware_ver: string | null;
  created_at: string;
}

export interface DashcamAlert {
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

// ─── Dashcams de la flotte ─────────────────────────────────────────────────────
export function useDashcams(fleetId: string | undefined) {
  return useQuery({
    queryKey: ["dashcams", fleetId],
    enabled: !!fleetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashcams")
        .select("*")
        .eq("fleet_id", fleetId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Dashcam[];
    },
  });
}

// ─── Alertes IA de la flotte ───────────────────────────────────────────────────
export function useDashcamAlerts(fleetId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["dashcam_alerts", fleetId, limit],
    enabled: !!fleetId,
    refetchInterval: 30_000, // Rafraîchir toutes les 30s
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashcam_alerts")
        .select("*")
        .eq("fleet_id", fleetId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as DashcamAlert[];
    },
  });
}

// ─── Acquitter une alerte ──────────────────────────────────────────────────────
export function useAckDashcamAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("dashcam_alerts")
        .update({ acknowledged: true, ack_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashcam_alerts"] });
    },
  });
}

// ─── Envoi batch d'alertes (1 appel réseau pour N alertes) ───────────────────
// Utiliser en lieu et place d'appels individuels → économie Supabase free tier
export function useSendDashcamAlerts() {
  return useMutation({
    mutationFn: async (alerts: {
      dashcam_id: string;
      event_type: string;
      confidence?: number;
      snapshot_url?: string;
      gps?: { lat: number; lon: number };
      speed_kmh?: number;
      metadata?: Record<string, unknown>;
    }[]) => {
      const { data, error } = await supabase.functions.invoke("dashcam-ai-webhook", {
        body: { alerts },
      });
      if (error) throw error;
      return data as { processed: number; inserted: number };
    },
  });
}

// ─── Enregistrer une nouvelle dashcam ─────────────────────────────────────────
export function useRegisterDashcam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      fleet_id: string;
      vehicle_id?: string;
      name: string;
      brand: string;
      stream_url?: string;
    }) => {
      const { data, error } = await supabase
        .from("dashcams")
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data as Dashcam;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["dashcams", vars.fleet_id] });
    },
  });
}
