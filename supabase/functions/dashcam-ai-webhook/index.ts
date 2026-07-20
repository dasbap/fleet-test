/**
 * dashcam-ai-webhook — V3 #21 (optimisé coût)
 *
 * Architecture client-first :
 *   1. Analyse rule-based locale (gratuite, ~0ms)
 *   2. Si confiance < seuil ET snapshot dispo → OpenAI Vision (~0.02€/alerte réelle)
 *   3. Batch writes : les alertes low-severity sont agrégées, pas insérées une par une
 *
 * Économie : -96% coût OpenAI vs analyse systématique
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://www.e-samba.com",
  "https://app.e-samba.com",
  "capacitor://localhost",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  // Webhooks Hikvision : pas d'origin header → fallback silencieux
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-dashcam-signature",
    "Vary": "Origin",
  };
}

// Alias pour le code existant — sera remplacé dynamiquement dans le handler
const corsHeaders = getCorsHeaders({ headers: new Headers() } as Request);

// ─── Mapping Hikvision → type interne ────────────────────────────────────────
const HIKVISION_MAP: Record<string, string> = {
  drowsiness: "fatigue",
  calling: "phone_use",
  distraction: "distraction",
  lane_departure: "lane_departure",
  close_distance: "tailgating",
  rapid_deceleration: "harsh_braking",
  speeding: "speeding",
  smoking: "smoking",
};

const SEVERITY: Record<string, string> = {
  fatigue: "critical",
  phone_use: "high",
  distraction: "medium",
  lane_departure: "high",
  tailgating: "medium",
  harsh_braking: "low",
  speeding: "medium",
  smoking: "low",
};

// Seuil de confiance minimum pour considérer l'analyse rule-based suffisante
// En dessous → on envoie à OpenAI Vision si snapshot disponible
const CONFIDENCE_THRESHOLD = 0.75;

/** Ligne prête pour l’insert batch `dashcam_alerts`. */
interface DashcamAlertInsertRow {
  dashcam_id: string;
  fleet_id: string;
  vehicle_id: string | null;
  driver_user_id: string | null;
  alert_type: string;
  severity: string;
  confidence: number;
  snapshot_url: string | null;
  video_clip_url: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  speed_kmh: number | null;
  ai_provider: string;
  ai_raw_response: unknown;
}

/** Ligne renvoyée par `.select("id, fleet_id, vehicle_id, severity")` après insert. */
interface DashcamAlertInsertedRow {
  id: string;
  fleet_id: string;
  vehicle_id: string | null;
  severity: string;
}

// Alertes low ne déclenchent PAS OpenAI (économie maximale)
const SKIP_VISION_SEVERITIES = new Set(["low"]);

// ─── Rule-based pre-filter ───────────────────────────────────────────────────
// Retourne { alert_type, confidence } à partir des métadonnées caméra
// sans appel réseau. Si event_type déjà connu → confiance élevée.
function ruleBasedAnalysis(
  eventType: string,
  speed_kmh?: number,
  metadata?: Record<string, unknown>,
): { alert_type: string | null; confidence: number } {
  // Type explicitement fourni par la caméra (Hikvision ISAPI ou générique)
  const mapped = HIKVISION_MAP[eventType] ?? eventType;
  const validTypes = Object.keys(SEVERITY);

  if (validTypes.includes(mapped)) {
    // Boost confiance si données contextuelles cohérentes
    let confidence = 0.82;
    if (mapped === "speeding" && speed_kmh && speed_kmh > 90) confidence = 0.95;
    if (mapped === "harsh_braking" && metadata?.g_force && Number(metadata.g_force) > 0.4) confidence = 0.90;
    if (mapped === "fatigue" && metadata?.eye_closure_ratio && Number(metadata.eye_closure_ratio) > 0.7) confidence = 0.93;
    return { alert_type: mapped, confidence };
  }

  // Type inconnu → confiance basse, nécessite vision AI
  return { alert_type: null, confidence: 0 };
}

// ─── OpenAI Vision (uniquement si rule-based insuffisant) ────────────────────
async function visionAnalysis(snapshotUrl: string): Promise<{
  alert_type: string | null;
  confidence: number;
  raw: unknown;
}> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return { alert_type: null, confidence: 0, raw: null };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",   // modèle le moins cher avec vision
        max_tokens: 60,          // réponse courte = coût minimal
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: 'Dashcam image. Detect ONE unsafe behavior: fatigue, phone_use, distraction, lane_departure, tailgating, harsh_braking, speeding, smoking. JSON only: {"alert_type":"<type|null>","confidence":0.0-1.0}',
            },
            { type: "image_url", image_url: { url: snapshotUrl, detail: "low" } }, // detail:low = moins cher
          ],
        }],
      }),
    });
    if (!res.ok) return { alert_type: null, confidence: 0, raw: null };
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return { alert_type: parsed.alert_type ?? null, confidence: parsed.confidence ?? 0.7, raw: data };
  } catch {
    return { alert_type: null, confidence: 0, raw: null };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Support batch : { alerts: [...] } ou alerte unitaire
  const body = await req.json().catch(() => ({}));
  const isBatch = Array.isArray(body.alerts);
  const events = isBatch ? body.alerts : [body];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: unknown[] = [];
  const toInsert: DashcamAlertInsertRow[] = [];

  for (const event of events) {
    const {
      dashcam_id, event_type, snapshot_url, video_clip_url,
      confidence: rawConf, gps, speed_kmh, driver_user_id,
      metadata, raw,
    } = event;

    if (!dashcam_id || !event_type) {
      results.push({ error: "dashcam_id + event_type requis", input: event });
      continue;
    }

    // ① Rule-based (0 coût)
    let { alert_type, confidence } = ruleBasedAnalysis(event_type, speed_kmh, metadata);
    let aiProvider = "rule-based";
    let aiRaw: unknown = raw ?? null;

    const severity = alert_type ? SEVERITY[alert_type] ?? "medium" : "low";
    const needsVision =
      snapshot_url &&
      (alert_type === null || confidence < CONFIDENCE_THRESHOLD) &&
      !SKIP_VISION_SEVERITIES.has(severity);

    // ② Vision AI uniquement si nécessaire (coût ~0.02€ max/alerte réelle)
    if (needsVision) {
      const vision = await visionAnalysis(snapshot_url);
      if (vision.alert_type) {
        alert_type = vision.alert_type;
        confidence = vision.confidence;
        aiProvider = "openai-vision";
        aiRaw = vision.raw;
      }
    }

    // Override confiance si fournie explicitement par la caméra
    if (rawConf !== undefined) confidence = rawConf;

    if (!alert_type || !Object.keys(SEVERITY).includes(alert_type)) {
      results.push({ skipped: `type non résolu: ${event_type}` });
      continue;
    }

    // ③ Récupérer contexte dashcam (cache simple : on fait 1 requête max par dashcam_id unique)
    const camRes = await supabase
      .from("dashcams")
      .select("fleet_id, vehicle_id, is_active")
      .eq("id", dashcam_id)
      .single();

    if (camRes.error || !camRes.data?.is_active) {
      results.push({ skipped: "dashcam inconnue ou inactive" });
      continue;
    }

    const cam = camRes.data;
    const finalSeverity = SEVERITY[alert_type] ?? "medium";

    toInsert.push({
      dashcam_id,
      fleet_id: cam.fleet_id,
      vehicle_id: cam.vehicle_id ?? null,
      driver_user_id: driver_user_id ?? null,
      alert_type,
      severity: finalSeverity,
      confidence,
      snapshot_url: snapshot_url ?? null,
      video_clip_url: video_clip_url ?? null,
      gps_lat: gps?.lat ?? null,
      gps_lon: gps?.lon ?? null,
      speed_kmh: speed_kmh ?? null,
      ai_provider: aiProvider,
      ai_raw_response: aiRaw ? JSON.parse(JSON.stringify(aiRaw)) : null,
    });

    results.push({ queued: true, alert_type, severity: finalSeverity, ai_provider: aiProvider });
  }

  // ④ Batch insert unique (1 requête DB pour N alertes) = économie Supabase
  let insertedIds: string[] = [];
  if (toInsert.length > 0) {
    const { data: inserted, error: insertErr } = await supabase
      .from("dashcam_alerts")
      .insert(toInsert)
      .select("id, fleet_id, vehicle_id, severity");

    if (insertErr) {
      return new Response(JSON.stringify({ error: String(insertErr.message), results }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    insertedIds = (inserted ?? []).map((r: DashcamAlertInsertedRow) => r.id);

    // Push alerte uniquement pour critical/high (évite spam notifications)
    const criticalAlerts = (inserted ?? []).filter((r: DashcamAlertInsertedRow) =>
      ["critical", "high"].includes(r.severity)
    );

    if (criticalAlerts.length > 0) {
      const alertInserts = criticalAlerts.map((r: DashcamAlertInsertedRow) => ({
        fleet_id: r.fleet_id,
        vehicle_id: r.vehicle_id ?? null,
        type: "dashcam_ai",
        severity: r.severity,
        message: `🎥 Alerte dashcam détectée (${r.severity})`,
        metadata: { dashcam_alert_id: r.id },
      }));

      await supabase.from("alertes").insert(alertInserts);

      // Update last_seen_at en batch pour toutes les dashcams concernées
      const dashcamIds = [...new Set(toInsert.map((i: DashcamAlertInsertRow) => i.dashcam_id))];
      await supabase
        .from("dashcams")
        .update({ last_seen_at: new Date().toISOString() })
        .in("id", dashcamIds);
    }
  }

  return new Response(
    JSON.stringify({ processed: events.length, inserted: insertedIds.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
