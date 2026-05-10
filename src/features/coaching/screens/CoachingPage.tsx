import { useState } from "react";
import { Mic, Play, Square, TrendingUp, TrendingDown, Minus, Volume2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCoachingSessions, useVoicePlayer, CoachingSession } from "@/hooks/useVoiceCoaching";
import { useFleetBillingContext } from "@/lib/fleet-billing-context";
import { cn } from "@/lib/utils";

const LANG_LABELS: Record<string, string> = { fr: "FR", en: "EN", ln: "LN" };

const SCORE_COLOR = (score: number) =>
  score >= 85 ? "text-green-600" : score >= 70 ? "text-yellow-600" : score >= 50 ? "text-orange-600" : "text-red-600";

const SCORE_BG = (score: number) =>
  score >= 85 ? "bg-green-50 border-green-200" : score >= 70 ? "bg-yellow-50 border-yellow-200"
  : score >= 50 ? "bg-orange-50 border-orange-200" : "bg-red-50 border-red-200";

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || Math.abs(delta) < 1) return <Minus className="h-4 w-4 text-muted-foreground" />;
  if (delta > 0)
    return <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><TrendingUp className="h-4 w-4" />+{Math.round(delta)}</span>;
  return <span className="flex items-center gap-1 text-red-600 text-sm font-medium"><TrendingDown className="h-4 w-4" />{Math.round(delta)}</span>;
}

function SessionCard({
  session,
  onPlay,
  isPlaying,
}: {
  session: CoachingSession;
  onPlay: (s: CoachingSession) => void;
  isPlaying: boolean;
}) {
  return (
    <Card className={cn("border", SCORE_BG(session.score))}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          {/* Score */}
          <div className="flex flex-col items-center min-w-[56px]">
            <span className={cn("text-2xl font-bold", SCORE_COLOR(session.score))}>
              {Math.round(session.score)}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
            <DeltaBadge delta={session.score_delta ?? null} />
          </div>

          {/* Texte coaching */}
          <p className="flex-1 text-sm leading-relaxed text-foreground">
            {session.coaching_text}
          </p>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="text-xs">{LANG_LABELS[session.lang] ?? session.lang}</Badge>
            <Button
              size="icon"
              variant={isPlaying ? "destructive" : "secondary"}
              className="h-9 w-9"
              onClick={() => onPlay(session)}
              title={isPlaying ? "Arrêter" : "Écouter"}
            >
              {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            {session.tts_provider === "elevenlabs"
            ? <Volume2 className="h-3.5 w-3.5 text-purple-500" title="Audio ElevenLabs" />
            : <Sparkles className="h-3.5 w-3.5 text-muted-foreground opacity-50" title="Passer en audio premium" />
          }
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(session.created_at).toLocaleString()}
          {session.status === "played" && " · écouté"}
        </p>
      </CardContent>
    </Card>
  );
}

export default function CoachingPage() {
  const billing = useFleetBillingContext();
  const driverProfileId = billing?.currentDriverId; // à brancher selon votre contexte auth
  const { data: sessions = [], isLoading } = useCoachingSessions(driverProfileId);
  const { play, stop, playing, activeSessionId } = useVoicePlayer();

  function handlePlay(session: CoachingSession) {
    if (playing && activeSessionId === session.id) {
      stop();
    } else {
      play(session);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Mic className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Coaching vocal</h1>
          <p className="text-sm text-muted-foreground">Retours audio personnalisés après chaque trajet</p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Mic className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun coaching disponible.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les retours audio apparaissent après chaque trajet enregistré.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isPlaying={playing && activeSessionId === session.id}
            onPlay={handlePlay}
          />
        ))}
      </div>
    </div>
  );
}
