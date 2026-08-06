import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANDING_CTA, getPrimaryAuthHref } from "@/config/navigation";

import heroBg from "@/assets/hero-bg.jpg";
import heroBg768Avif from "@/assets/hero-bg-768.avif";
import heroBg1280Avif from "@/assets/hero-bg-1280.avif";
import heroBg1920Avif from "@/assets/hero-bg-1920.avif";
import heroBg768Webp from "@/assets/hero-bg-768.webp";
import heroBg1280Webp from "@/assets/hero-bg-1280.webp";
import heroBg1920Webp from "@/assets/hero-bg-1920.webp";

const DEFAULT_APK_URL = "";

const HeroSection = () => {
  const priorityAttrs = {
    fetchpriority: "high",
  };

  const apkUrl =
    import.meta.env.VITE_ANDROID_APK_URL?.trim() || DEFAULT_APK_URL;

  const highlights = [
    "Gestion multi-flottes",
    "Suivi temps réel",
    "Paiements Mobile Money",
  ];

  const handleApkDownload = () => {
    if (!apkUrl) {
      return;
    }

    window.location.assign(apkUrl);
  };

  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden pb-6 pt-20 sm:min-h-[calc(100vh-5rem)]">
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
            alt="Tableau de bord de gestion de flotte E-Samba"
            width={1920}
            height={1080}
            className="h-full w-full object-cover opacity-30"
            {...priorityAttrs}
            loading="eager"
            decoding="async"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 100vw, 1280px"
          />
        </picture>

        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>

            <span className="text-sm font-medium">Smart Mobility Africa</span>
          </div>

          <h1 className="mb-4 animate-fade-in-up font-heading text-3xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Gérez votre flotte avec{" "}
            <span className="text-gradient">intelligence</span>
          </h1>

          <p
            className="mx-auto mb-6 max-w-2xl animate-fade-in-up text-base text-muted-foreground sm:text-lg"
            style={{
              animationDelay: "0.1s",
            }}
          >
            E-Samba est la plateforme SaaS de gestion de flotte conçue pour
            l’Afrique. Taxis, logistique, transport : tout en un seul endroit.
          </p>

          <div
            className="mb-7 flex animate-fade-in-up flex-wrap justify-center gap-3"
            style={{
              animationDelay: "0.2s",
            }}
          >
            {highlights.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div
            className="flex animate-fade-in-up flex-col items-center justify-center gap-3 sm:flex-row"
            style={{
              animationDelay: "0.3s",
            }}
          >
            <Button
              size="lg"
              className="min-h-[44px] w-full shadow-glow sm:w-auto"
              asChild
            >
              <Link to={getPrimaryAuthHref()}>
                {LANDING_CTA.signupLabel}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              type="button"
              size="lg"
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={!apkUrl}
              onClick={handleApkDownload}
            >
              <Smartphone className="mr-2 h-5 w-5" />
              Télécharger l’application mobile
              <Download className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Application Android au format APK
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
