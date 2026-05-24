import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import heroBg768Avif from "@/assets/hero-bg-768.avif";
import heroBg1280Avif from "@/assets/hero-bg-1280.avif";
import heroBg1920Avif from "@/assets/hero-bg-1920.avif";
import heroBg768Webp from "@/assets/hero-bg-768.webp";
import heroBg1280Webp from "@/assets/hero-bg-1280.webp";
import heroBg1920Webp from "@/assets/hero-bg-1920.webp";

const HeroSection = () => {
  const highlights = [
    "Gestion multi-flottes",
    "Suivi temps réel",
    "Paiements Mobile Money",
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background image: priorité LCP et tailles responsives adaptées mobile. */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source
            type="image/avif"
            srcSet={`${heroBg768Avif} 768w, ${heroBg1280Avif} 1280w, ${heroBg1920Avif} 1920w`}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1280px"
          />
          <source
            type="image/webp"
            srcSet={`${heroBg768Webp} 768w, ${heroBg1280Webp} 1280w, ${heroBg1920Webp} 1920w`}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1280px"
          />
          <img
            src={heroBg}
            alt="Fleet Management Dashboard"
            width={1920}
            height={1080}
            className="w-full h-full object-cover opacity-30"
            fetchpriority="high"
            loading="eager"
            decoding="async"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1280px"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </div>

      {/* Décor réduit pour limiter le travail de peinture initial (LCP mobile). */}

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium">
              Smart Mobility Africa
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold leading-tight mb-6 animate-fade-in-up">
            Gérez votre flotte avec{" "}
            <span className="text-gradient">intelligence</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            E-Samba est la plateforme SaaS de gestion de flotte conçue pour
            l'Afrique. Taxis, logistique, transport — tout en un seul endroit.
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap justify-center gap-4 mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            {highlights.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" className="shadow-glow" asChild>
              <Link to="/auth?mode=signup">
                Démarrer gratuitement
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="group" asChild>
              <a
                href="#demo-video"
                title="Écouter la démo audio E-Samba"
                aria-label="Écouter la présentation audio de E-Samba — gestion de flotte"
              >
                <Play className="mr-2 w-5 h-5 group-hover:text-primary transition-colors" />
                Écouter la démo
              </a>
            </Button>
          </div>

          {/* Stats repoussées hors du above-the-fold critique pour le LCP. */}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
