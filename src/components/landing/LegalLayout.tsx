import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

interface Props {
  titre: string;
  sousTitre?: string;
  miseAJour: string;
  children: ReactNode;
}

/**
 * Coque commune pour toutes les pages légales et institutionnelles.
 * Applique le design E-Samba : fond dégradé, typographie heading, couleurs système.
 */
export function LegalLayout({ titre, sousTitre, miseAJour, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* En-tête */}
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-28 pb-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">{titre}</h1>
            {sousTitre && (
              <p className="text-muted-foreground mt-1 mb-3">{sousTitre}</p>
            )}
            <p className="text-xs text-muted-foreground/70">
              Dernière mise à jour : {miseAJour}
            </p>
          </div>
        </section>

        {/* Corps */}
        <article className="container mx-auto px-4 py-14 max-w-3xl space-y-10">
          {children}
        </article>

        {/* Retour accueil */}
        <div className="container mx-auto px-4 pb-16 max-w-3xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Zap className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** Bloc de section réutilisable dans les pages légales. */
export function LegalSection({
  titre,
  children,
}: {
  titre: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-xl font-bold mb-3 text-foreground border-b border-border pb-2">
        {titre}
      </h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
