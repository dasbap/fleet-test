import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── i18n coaching messages ───────────────────────────────────────────────────
const MESSAGES: Record<string, Record<string, (...args: any[]) => string>> = {
  fr: {
    excellent: (score: number, delta: string) =>
      `Excellent trajet ! Score ${score}/100. ${delta}Continuez sur cette lancée, votre conduite est exemplaire.`,
    good: (score: number, delta: string) =>
      `Bon trajet. Score ${score}/100. ${delta}Quelques ajustements sur la vitesse et vous serez parfait.`,
    average: (score: number, delta: string) =>
      `Trajet moyen. Score ${score}/100. ${delta}Attention aux freinages brusques et aux excès de vitesse.`,
    poor: (score: number, delta: string) =>
      `Score ${score}/100 — améliorations nécessaires. ${delta}Réduisez la vitesse et anticipez les freinages.`,
    deltaUp: (d: number) => `Vous avez progressé de ${d} points. `,
    deltaDown: (d: number) => `Votre score a baissé de ${d} points. `,
    deltaFlat: () => "",
  },
  en: {
    excellent: (score: number, delta: string) =>
      `Great trip! Score ${score}/100. ${delta}Keep it up, your driving is exemplary.`,
    good: (score: number, delta: string) =>
      `Good trip. Score ${score}/100. ${delta}Minor speed adjustments will make you perfect.`,
    average: (score: number, delta: string) =>
      `Average trip. Score ${score}/100. ${delta}Watch out for harsh braking and speeding.`,
    poor: (score: number, delta: string) =>
      `Score ${score}/100 — improvement needed. ${delta}Slow down and anticipate braking.`,
    deltaUp: (d: number) => `You improved by ${d} points. `,
    deltaDown: (d: number) => `Your score dropped by ${d} points. `,
    deltaFlat: () => "",
  },
  ln: {
    excellent: (score: number, delta: string) =>
      `Mobembo ya malamu! Score ${score}/100. ${delta}Koba bongo, kombo na yo ezali malamu mingi.`,
    good: (score: number, delta: string) =>
      `Mobembo ya malamu. Score ${score}/100. ${delta}Tika moke vitesse, okozala ya kokamwa.`,
    average: (score: number, delta: string) =>
      `Score ${score}/100. ${delta}Benga kobenda makasi mpe vitesse ya koleka.`,
    poor: (score: number, delta: string) =>
      `Score ${score}/100 — osengeli kobongisa. ${delta}Kita vitesse mpe yeba kobenda.`,
    deltaUp: (d: number) => `Ochondaki ${d} points. `,
    deltaDown: (d: number) => `Score na yo ekitaki na ${d} points. `,
    deltaFlat: () => "",
  },
};

function buildCoachingText(
  lang: string,
  score: number,
  scoreDelta: number | null,
): string {
  const m = MESSAGES[lang] ?? MESSAGES["fr"];
  let deltaStr = "";
  if (scoreDelta !== null) {
    if (scoreDelta > 2) deltaStr = m.deltaUp(Math.round(scoreDelta));
    else if (scoreDelta < -2) deltaStr = m.deltaDown(Math.round(Math.abs(scoreDelta)));
    else deltaStr = m.deltaFlat();
  }
  const level = score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "average" : "poor";
  return m[level](Math.round(score), deltaStr);
}

// ─── ElevenLabs TTS (optional) ────────────────────────────────────────────────
async function generateElevenLabsAudio(text: string, lang: string): Promise<ArrayBuffer | null> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return null;

  // Voix par langue (IDs ElevenLabs gratuits)
  const voiceId: Record<string, string> = {
    fr: "pNInz6obpgDQGcFmaJgB", // Adam (FR)
    en: "EXAVITQu4vr4xnSDxMaL", // Bella (EN)
    ln: "pNInz6obpgDQGcFmaJgB", // fallback FR pour Lingala
  };

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId[lang] ?? voiceId["fr"]}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    // use_elevenlabs: false par défaut → Web Speech API côté client (gratuit)
    // Mettre à true uniquement quand l'utilisateur clique "Générer audio premium"
    const { driver_user_id, fleet_id, shift_id, score, lang = "fr", use_elevenlabs = false } = body;
    const driver_id = driver_user_id; // alias local

    if (!driver_id || !fleet_id || score === undefined) {
      return new Response(JSON.stringify({ error: "driver_user_id, fleet_id, score requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score delta vs dernière session
    const { data: lastSession } = await supabase
      .from("coaching_sessions")
      .select("score")
      .eq("driver_id", driver_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const scoreDelta = lastSession ? score - lastSession.score : null;

    // Génération du texte
    const coachingText = buildCoachingText(lang, score, scoreDelta);

    // TTS ElevenLabs uniquement si explicitement demandé (use_elevenlabs: true)
    // → Par défaut Web Speech API côté client (0 coût, 0 latence réseau)
    let audioUrl: string | null = null;
    let ttsProvider = "web-speech";

    const audioBuffer = use_elevenlabs ? await generateElevenLabsAudio(coachingText, lang) : null;
    if (audioBuffer) {
      const fileName = `coaching/${driver_id}/${Date.now()}.mp3`;
      const { error: uploadErr } = await supabase.storage
        .from("reports")
        .upload(fileName, audioBuffer, { contentType: "audio/mpeg", upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("reports").getPublicUrl(fileName);
        audioUrl = urlData.publicUrl;
        ttsProvider = "elevenlabs";
      }
    }

    // Insertion en base
    const { data: session, error: insertErr } = await supabase
      .from("coaching_sessions")
      .insert({
        fleet_id,
        driver_user_id: driver_id,
        shift_id: shift_id ?? null,
        score,
        score_delta: scoreDelta,
        lang,
        coaching_text: coachingText,
        audio_url: audioUrl,
        tts_provider: ttsProvider,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Push notification (si FCM token disponible)
    const { data: tokenRow } = await supabase
      .from("notification_tokens")
      .select("token")
      .eq("user_id", driver_id)
      .eq("platform", "android")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let pushSent = false;
    if (tokenRow?.token) {
      const fcmKey = Deno.env.get("FCM_SERVER_KEY");
      if (fcmKey) {
        const pushRes = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            Authorization: `key=${fcmKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: tokenRow.token,
            notification: {
              title: lang === "fr" ? "🎙️ Coaching post-trajet" : "🎙️ Post-trip coaching",
              body: coachingText.substring(0, 120),
            },
            data: { coaching_session_id: session.id, audio_url: audioUrl ?? "" },
          }),
        });
        pushSent = pushRes.ok;
      }
    }

    if (pushSent) {
      await supabase
        .from("coaching_sessions")
        .update({ push_sent_at: new Date().toISOString(), status: "delivered" })
        .eq("id", session.id);
    }

    return new Response(
      JSON.stringify({ session_id: session.id, coaching_text: coachingText, audio_url: audioUrl, push_sent: pushSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
