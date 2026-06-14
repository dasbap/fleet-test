import { supabase } from "@/integrations/supabase/client";

export interface CoachingSessionRow {
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

export interface GenerateCoachingInput {
  driver_user_id: string;
  fleet_id: string;
  shift_id?: string;
  score: number;
  lang?: "fr" | "en" | "ln";
  use_elevenlabs?: boolean;
}

export interface GenerateCoachingResult {
  session_id: string;
  coaching_text: string;
  audio_url: string | null;
  push_sent: boolean;
}

/**
 * Accès Supabase sessions coaching vocal + edge function.
 */
export class VoiceCoachingRepository {
  async findSessionsByDriver(driverId: string, limit = 20): Promise<CoachingSessionRow[]> {
    const { data, error } = await supabase
      .from("coaching_sessions")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erreur chargement coaching_sessions:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as CoachingSessionRow[];
  }

  async markSessionPlayed(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from("coaching_sessions")
      .update({ status: "played", played_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) {
      console.error("Erreur marquage session jouée:", error);
      throw new Error(error.message);
    }
  }

  async generateCoaching(input: GenerateCoachingInput): Promise<GenerateCoachingResult> {
    const { data, error } = await supabase.functions.invoke("generate-voice-coaching", {
      body: { use_elevenlabs: false, ...input },
    });

    if (error) {
      console.error("Erreur generate-voice-coaching:", error);
      throw new Error(error.message);
    }

    return data as GenerateCoachingResult;
  }
}
