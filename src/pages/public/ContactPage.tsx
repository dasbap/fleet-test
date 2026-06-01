import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { PublicCtaSection } from "@/components/landing/PublicCtaSection";
import { ContactDemoForm } from "@/components/landing/ContactDemoForm";
import { usePageSeo } from "@/hooks/usePageSeo";

export default function ContactPage() {
  usePageSeo("contact");
  const location = useLocation();
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.hash === "#demo" && demoRef.current) {
      demoRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <PublicPageLayout>
      <PublicPageHero
        eyebrow="Contact"
        title="Parlons de votre flotte"
        description="Demandez une démo personnalisée ou contactez notre équipe commerciale."
      />

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-2xl font-heading font-bold mb-6">Nous contacter</h2>
              <div className="space-y-4 mb-8">
                <a
                  href="mailto:contact@e-samba.com"
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm md:text-base"
                >
                  <Mail className="w-5 h-5 shrink-0" />
                  contact@e-samba.com
                </a>
                <a
                  href="tel:+237641341857"
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm md:text-base"
                >
                  <Phone className="w-5 h-5 shrink-0" />
                  +237 6 41 34 18 57
                </a>
                <div className="flex items-center gap-3 text-muted-foreground text-sm md:text-base">
                  <MapPin className="w-5 h-5 shrink-0" />
                  Douala, Cameroun
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                Un expert E-Samba vous configure une démonstration personnalisée en 30 minutes —
                taxis, logistique, transport scolaire ou inter-urbain. Sans engagement.
              </p>
            </div>

            <div
              id="demo"
              ref={demoRef}
              className="bg-card border border-border rounded-2xl p-8 shadow-lg scroll-mt-24"
            >
              <ContactDemoForm />
            </div>
          </div>
        </div>
      </section>

      <PublicCtaSection />
    </PublicPageLayout>
  );
}
