import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { VoiceCoachingRepository } from "@/repositories/voice-coaching.repository";
import {
  VoiceCoachingService,
  type CoachingSession,
} from "@/services/voice-coaching.service";

export type { CoachingSession };

const voiceCoachingRepository = new VoiceCoachingRepository();
const voiceCoachingService = new VoiceCoachingService(voiceCoachingRepository);

export function useCoachingSessions(driverId: string | undefined) {
  return useQuery({
    queryKey: ["coaching_sessions", driverId],
    enabled: !!driverId,
    queryFn: () => voiceCoachingService.listSessions(driverId!),
  });
}

export function useGenerateCoaching() {
  return useMutation({
    mutationFn: voiceCoachingService.generateSession.bind(voiceCoachingService),
  });
}

export function useVoicePlayer() {
  const [playing, setPlaying] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const play = useCallback(async (session: CoachingSession) => {
    stop();
    setSessionId(session.id);
    setPlaying(true);

    void voiceCoachingService.markPlayed(session.id).catch(() => {
      /* non bloquant */
    });

    if (session.audio_url) {
      const audio = new Audio(session.audio_url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        speakText(session.coaching_text, session.lang);
      };
      await audio.play();
      return;
    }

    speakText(session.coaching_text, session.lang);
  }, []);

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
