import { Mail, MapPin, Phone } from "lucide-react";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { ContactDemoForm } from "@/components/landing/ContactDemoForm";
import { CONTACT } from "@/config/navigation";
import { usePageSeo } from "@/hooks/usePageSeo";

export default function ContactPage() {
  usePageSeo("contact");

  return (
    <PublicPageLayout>
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <h1 className="text-2xl font-heading font-bold mb-6">
                Nous contacter
              </h1>
              <div className="space-y-4 mb-8">
                <a
                  href={CONTACT.mailtoHref}
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm md:text-base"
                >
                  <Mail className="w-5 h-5 shrink-0" />
                  {CONTACT.email}
                </a>
                <a
                  href={CONTACT.telHref}
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm md:text-base"
                >
                  <Phone className="w-5 h-5 shrink-0" />
                  {CONTACT.phoneDisplay}
                </a>
                <div className="flex items-center gap-3 text-muted-foreground text-sm md:text-base">
                  <MapPin className="w-5 h-5 shrink-0" />
                  {CONTACT.city}
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                Un compte vous sera créé après votre demande de démo sous 48h.
                Vous pourrez ensuite accéder à votre tableau de bord et
                commencer à gérer votre flotte.
              </p>
            </div>

            <div
              className="bg-card border border-border rounded-2xl p-8 shadow-lg"
            >
              <ContactDemoForm />
            </div>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
