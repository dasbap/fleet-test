import { useRef, useState, useCallback, useEffect } from "react";
import { Play, Pause, MessageCircle, ArrowRight, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AUDIO_URL =
  import.meta.env.VITE_DEMO_AUDIO_URL ||
  "/audio/E-SAMBA_dompte_le_chaos_logistique.m4a";

const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || "237641341857";

const stats = [
  { value: "500+", label: "Véhicules gérés" },
  { value: "< 5 min", label: "Setup mobile" },
  { value: "3 pays", label: "Zone CEMAC" },
];

// Formate les secondes en mm:ss
function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function DemoVideoSection() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying]           = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [dragging, setDragging]         = useState(false);

  // ─── Handlers audio ────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play().catch(() => {}); } else { a.pause(); }
  }, []);

  const onTimeUpdate = useCallback(() => {
    if (!dragging) setCurrentTime(audioRef.current?.currentTime ?? 0);
  }, [dragging]);

  const onLoadedMetadata = useCallback(() => {
    setDuration(audioRef.current?.duration ?? 0);
  }, []);

  const onEnded = useCallback(() => {
    setPlaying(false);
    setCurrentTime(0);
  }, []);

  // ─── Barre de progression cliquable ────────────────────────────────────────

  const seekTo = useCallback((clientX: number) => {
    const bar = progressRef.current;
    const a   = audioRef.current;
    if (!bar || !a || !a.duration) return;
    const { left, width } = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
    a.currentTime = ratio * a.duration;
    setCurrentTime(a.currentTime);
  }, []);

  const onProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => seekTo(e.clientX),
    [seekTo],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setDragging(true);
      seekTo(e.clientX);
    },
    [seekTo],
  );

  // Drag global pour ne pas perdre le curseur
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => seekTo(e.clientX);
    const onUp   = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, seekTo]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section id="demo-video" className="py-20 md:py-28 bg-muted/20">
      <div className="container mx-auto px-4">
        {/* Titre */}
        <div className="max-w-4xl mx-auto text-center mb-10">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Écouter E-Samba en action
          </span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mt-3 mb-4">
            La gestion de flotte{" "}
            <span className="text-gradient">réinventée pour l'Afrique</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Comprendre comment E-Samba transforme votre flotte au quotidien.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Player audio */}
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg bg-[#0d1117]">
            {/* Fond animé quand lecture en cours */}
            <div
              className={`absolute inset-0 transition-opacity duration-700 ${
                playing ? "opacity-100" : "opacity-0"
              }`}
              style={{
                background:
                  "radial-gradient(ellipse at 50% 80%, rgba(20,184,166,0.15) 0%, transparent 70%)",
              }}
            />

            {/* Logo / branding */}
            <div className="relative flex flex-col items-center justify-center px-8 pt-10 pb-8 gap-6">
              {/* Icône audio */}
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-primary opacity-80" />
                <span className="text-white/60 text-sm font-medium tracking-wide">
                  E-Samba — Audio démo
                </span>
              </div>

              {/* Titre piste */}
              <p className="text-white font-heading font-semibold text-lg text-center leading-snug">
                E-Samba dompte le chaos logistique
              </p>

              {/* Visualiseur statique (barres) */}
              <div className="flex items-end gap-[3px] h-10">
                {Array.from({ length: 32 }).map((_, i) => {
                  const heights = [
                    40, 60, 80, 55, 90, 70, 45, 85, 65, 50,
                    75, 95, 60, 40, 70, 85, 55, 90, 65, 45,
                    80, 60, 75, 50, 90, 70, 55, 85, 40, 65,
                    95, 50,
                  ];
                  const pct    = heights[i % heights.length]!;
                  const filled = (i / 32) * 100 <= progress;
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-colors duration-150 ${
                        filled ? "bg-primary" : "bg-white/15"
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  );
                })}
              </div>

              {/* Barre de progression */}
              <div className="w-full space-y-2">
                <div
                  ref={progressRef}
                  className="relative w-full h-1.5 rounded-full bg-white/10 cursor-pointer group"
                  onClick={onProgressClick}
                  onMouseDown={onMouseDown}
                  role="slider"
                  aria-label="Progression audio"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Poignée */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>

                {/* Temps */}
                <div className="flex justify-between text-xs text-white/40 select-none">
                  <span>{formatTime(currentTime)}</span>
                  <span>{duration > 0 ? formatTime(duration) : "2:04"}</span>
                </div>
              </div>

              {/* Bouton Play / Pause */}
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-glow hover:scale-110 active:scale-95 transition-transform duration-200"
                aria-label={playing ? "Mettre en pause" : "Lancer l'audio de démonstration E-Samba"}
              >
                {playing ? (
                  <Pause className="w-6 h-6 text-white" fill="white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                )}
              </button>

              {/* Élément audio natif (caché) */}
              <audio
                ref={audioRef}
                src={AUDIO_URL}
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {stats.map(({ value, label }) => (
              <div
                key={label}
                className="text-center p-4 rounded-xl bg-muted/40 border"
              >
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Button size="lg" className="shadow-glow" asChild>
              <Link to="/auth?mode=signup">
                Démarrer gratuitement
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  "Bonjour, je souhaite une démo live de E-Samba.",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 w-4 h-4" />
                Demander une démo live
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
