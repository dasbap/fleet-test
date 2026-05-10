import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CoachingSession {
  id: string;
  score: number;
  score_delta: number | null;
  lang: string;
  coaching_text: string;
  audio_url: string | null;
  tts_provider: string;
  status: string;
  created_at: string;
}

// ─── Récupère les dernières sessions de coaching pour un conducteur ────────────
export function useCoachingSessions(driverId: string | undefined) {
  return useQuery({
    queryKey: ["coaching_sessions", driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select("*")
        .eq("driver_id", driverId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as CoachingSession[];
    },
  });
}

// ─── Génère une session de coaching post-trajet ───────────────────────────────
// use_elevenlabs: false par défaut (Web Speech côté client, 0 coût)
// Passer true uniquement sur action utilisateur explicite "Audio premium"
export function useGenerateCoaching() {
  return useMutation({
    mutationFn: async (params: {
      driver_user_id: string;
      fleet_id: string;
      shift_id?: string;
      score: number;
      lang?: "fr" | "en" | "ln";
      use_elevenlabs?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke("generate-voice-coaching", {
        body: { use_elevenlabs: false, ...params },
      });
      if (error) throw error;
      return data as { session_id: string; coaching_text: string; audio_url: string | null; push_sent: boolean };
    },
  });
}

// ─── Lecture audio in-app (Web Speech API + fallback URL audio) ───────────────
export function useVoicePlayer() {
  const [playing, setPlaying] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const play = useCallback(
    async (session: CoachingSession) => {
      stop();
      setSessionId(session.id);
      setPlaying(true);

      // Marquer comme joué
      supabase
        .from("coaching_sessions")
        .update({ status: "played", played_at: new Date().toISOString() })
        .eq("id", session.id)
        .then(() => {});

      // Priorité 1 : URL audio ElevenLabs
      if (session.audio_url) {
        const audio = new Audio(session.audio_url);
        audioRef.current = audio;
        audio.onended = () => setPlaying(false);
        audio.onerror = () => {
          // fallback Web Speech
          speakText(session.coaching_text, session.lang);
        };
        await audio.play();
        return;
      }

      // Priorité 2 : Web Speech API (gratuit, intégré navigateur)
      speakText(session.coaching_text, session.lang);
    },
    [],
  );

  function speakText(text: string, lang: string) {
    if (!("speechSynthesis" in window)) {
      setPlaying(false);
      return;
    }
    const langMap: Record<string, string> = { fr: "fr-FR", en: "en-US", ln: "fr-FR" };
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langMap[lang] ?? "fr-FR";
    utterance.rate = 0.95;
    utterance.onend = () => setPlaying(false);
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (synthRef.current && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
    setSessionId(null);
  }

  return { play, stop, playing, activeSessionId: sessionId };
}
