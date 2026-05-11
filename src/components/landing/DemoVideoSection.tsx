import { useState } from "react";
import { Play, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const VIDEO_ID = "7vl79App-Fs";
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "237641461148";

const stats = [
  { value: "500+", label: "Véhicules gérés" },
  { value: "< 5 min", label: "Setup mobile" },
  { value: "3 pays", label: "Zone CEMAC" },
];

export function DemoVideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="demo-video" className="py-20 md:py-28 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Voir E-Samba en action
          </span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mt-3 mb-4">
            La gestion de flotte{" "}
            <span className="text-gradient">réinventée pour l'Afrique</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            2 minutes pour comprendre comment E-Samba transforme votre flotte au quotidien.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Player */}
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg bg-black aspect-video">
            {playing ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
                title="Démo E-Samba — Gestion de flotte en Afrique"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            ) : (
              <>
                <img
                  src={`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
                  alt="Aperçu démo E-Samba"
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/30" />
                <button
                  onClick={() => setPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center group"
                  aria-label="Lancer la vidéo de démonstration E-Samba"
                >
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-200">
                    <Play className="w-7 h-7 text-white ml-1" fill="white" />
                  </div>
                </button>
                <span className="absolute bottom-3 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
                  2:04
                </span>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center p-4 rounded-xl bg-muted/40 border">
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
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjour, je souhaite une démo live de E-Samba.")}`}
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
