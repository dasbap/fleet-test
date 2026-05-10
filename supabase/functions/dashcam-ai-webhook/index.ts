/**
 * dashcam-ai-webhook — Edge Function V3 #21
 *
 * Point d'entrée universel pour les alertes dashcam :
 *   POST /dashcam-ai-webhook
 *   Body: { dashcam_id, event_type, snapshot_url?, confidence?, gps?, speed_kmh?, raw? }
 *
 * Supporte :
 *   - Caméras génériques RTSP/MJPEG via analyse rule-based
 *   - Hikvision via ISAPI event payload
 *   - Vision AI (OpenAI GPT-4o-vision ou AWS Rekognition) si configuré
 *   - Webhook push temps réel vers flottes abonnées
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dashcam-signature",
};

// ─── Mapping événements Hikvision → alert_type interne ───────────────────────
const HIKVISION_EVENT_MAP: Record<string, string> = {
  "drowsiness":        "fatigue",
  "calling":           "phone_use",
  "distraction":       "distraction",
  "lane_departure":    "lane_departure",
  "close_distance":    "tailgating",
  "rapid_deceleration":"harsh_braking",
  "speeding":          "speeding",
  "smoking":           "smoking",
};

// Severity par type d'alerte (rule-based par défaut)
const DEFAULT_SEVERITY: Record<string, string> = {
  fatigue:        "critical",
  phone_use:      "high",
  distraction:    "medium",
  lane_departure: "high",
  tailgating:     "medium",
  harsh_braking:  "low",
  speeding:       "medium",
  smoking:        "low",
};

// ─── Analyse vision AI (OpenAI GPT-4o-vision) ────────────────────────────────
async function analyzeWithVision(snapshotUrl: string): Promise<{
  alert_type: string | null;
  confidence: number;
  raw: unknown;
}> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey || !snapshotUrl) return { alert_type: null, confidence: 0, raw: null };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this dashcam image. Detect ONE of these unsafe driving behaviors: fatigue, phone_use, distraction, lane_departure, tailgating, harsh_braking, speeding, smoking. Reply ONLY with JSON: {"alert_type": "<type or null>", "confidence": 0.0-1.0}`,
            },
            { type: "image_url", image_url: { url: snapshotUrl, detail: "low" } },
          ],
        }],
      }),
    });

    if (!res.ok) return { alert_type: null, confidence: 0, raw: null };
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return { alert_type: parsed.alert_type ?? null, confidence: parsed.confidence ?? 0.8, raw: data };
  } catch {
    return { alert_type: null, confidence: 0, raw: null };
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const {
      dashcam_id,
      event_type,       // type interne ou event Hikvision
      snapshot_url,
      video_clip_url,
      confidence: rawConfidence,
      gps,              // { lat, lon }
      speed_kmh,
      driver_user_id,
      raw,              // payload brut constructeur
    } = body;

    if (!dashcam_id) {
      return new Response(JSON.stringify({ error: "dashcam_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer la dashcam + fleet/vehicle context
    const { data: cam, error: camErr } = await supabase
      .from("dashcams")
      .select("id, fleet_id, vehicle_id, is_active, brand")
      .eq("id", dashcam_id)
      .single();

    if (camErr || !cam) {
      return new Response(JSON.stringify({ error: "dashcam introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cam.is_active) {
      return new Response(JSON.stringify({ skipped: "dashcam inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mettre à jour last_seen_at
    await supabase.from("dashcams").update({ last_seen_at: new Date().toISOString() }).eq("id", dashcam_id);

    // Normaliser le type d'alerte
    let alertType: string = HIKVISION_EVENT_MAP[event_type] ?? event_type;
    let confidence: number = rawConfidence ?? 0.8;
    let aiProvider = "rule-based";
    let aiRaw: unknown = raw ?? null;

    // Vision AI si snapshot disponible et type inconnu
    const validTypes = Object.keys(DEFAULT_SEVERITY);
    if (snapshot_url && !validTypes.includes(alertType)) {
      const vision = await analyzeWithVision(snapshot_url);
      if (vision.alert_type) {
        alertType = vision.alert_type;
        confidence = vision.confidence;
        aiProvider = "openai-vision";
        aiRaw = vision.raw;
      }
    }

    // Ignorer les types invalides après toutes les tentatives
    if (!validTypes.includes(alertType)) {
      return new Response(JSON.stringify({ skipped: `type inconnu: ${alertType}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const severity = DEFAULT_SEVERITY[alertType] ?? "medium";

    // Insérer l'alerte
    const { data: alert, error: insertErr } = await supabase
      .from("dashcam_alerts")
      .insert({
        dashcam_id,
        fleet_id: cam.fleet_id,
        vehicle_id: cam.vehicle_id ?? null,
        driver_user_id: driver_user_id ?? null,
        alert_type: alertType,
        severity,
        confidence,
        snapshot_url: snapshot_url ?? null,
        video_clip_url: video_clip_url ?? null,
        gps_lat: gps?.lat ?? null,
        gps_lon: gps?.lon ?? null,
        speed_kmh: speed_kmh ?? null,
        ai_provider: aiProvider,
        ai_raw_response: aiRaw ? JSON.parse(JSON.stringify(aiRaw)) : null,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Push notification temps réel pour alertes critiques/high
    if (["critical", "high"].includes(severity)) {
      await supabase.from("alertes").insert({
        fleet_id: cam.fleet_id,
        vehicle_id: cam.vehicle_id ?? null,
        type: "dashcam_ai",
        severity,
        message: `🎥 Alerte dashcam : ${alertType.replace("_", " ")} (confiance ${Math.round(confidence * 100)}%)`,
        metadata: { dashcam_alert_id: alert.id, snapshot_url: snapshot_url ?? null },
      }).then(() => {});
    }

    return new Response(
      JSON.stringify({ alert_id: alert.id, alert_type: alertType, severity, confidence }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
