import { useState } from "react";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { JobPostingCard } from "@/components/landing/JobPostingCard";
import { CommercialRolesSynthesis } from "@/components/landing/CommercialRolesSynthesis";
import { buildMailtoHref, DEPARTMENT_EMAILS } from "@/config/navigation";
import {
  CARRIERES_POSTES_COMMERCIAUX_YAOUNDE,
  CARRIERES_POSTES_PRIORITAIRES_AUTRES,
  CARRIERES_POSTES_A_VENIR,
} from "@/data/marketing/carrieres-postes";
import { usePageSeo } from "@/hooks/usePageSeo";

const AVANTAGES = [
  "Environnement de travail flexible (hybride)",
  "Produit à impact réel sur l'économie africaine",
  "Équipe à taille humaine, décisions rapides",
  "Formation continue et veille technologique",
  "Rémunération compétitive selon profil",
  "Opportunités de mobilité dans la zone CEMAC",
];

export default function CarrieresPage() {
  usePageSeo("carrieres");

  const [openId, setOpenId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <PublicPageLayout>
      <PublicPageHero
        eyebrow="Recrutement"
        title="Carrières"
        description="Rejoignez une équipe qui construit l'avenir du transport intelligent en Afrique Centrale. Nous cherchons des personnes passionnées, autonomes et prêtes à avoir un impact réel."
      />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-heading text-2xl font-bold mb-2">Recrutement prioritaire</h2>
          <p className="text-sm text-muted-foreground mb-10">
            Postes ouverts immédiatement — priorité produit et commercial.
          </p>

          <div className="mb-12">
            <h3 className="font-heading text-lg font-semibold mb-4">
              Équipe commerciale Yaoundé
            </h3>
            <CommercialRolesSynthesis />
            <div className="space-y-5">
              {CARRIERES_POSTES_COMMERCIAUX_YAOUNDE.map((posting) => (
                <JobPostingCard
                  key={posting.id}
                  posting={posting}
                  open={openId === posting.id}
                  onToggle={() => handleToggle(posting.id)}
                />
              ))}
            </div>
          </div>

          {CARRIERES_POSTES_PRIORITAIRES_AUTRES.length > 0 ? (
            <div className="space-y-5">
              {CARRIERES_POSTES_PRIORITAIRES_AUTRES.map((posting) => (
                <JobPostingCard
                  key={posting.id}
                  posting={posting}
                  open={openId === posting.id}
                  onToggle={() => handleToggle(posting.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="py-16 border-t border-border bg-muted/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-heading text-2xl font-bold mb-2">Ouvertures à venir</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Postes planifiés — vous pouvez déjà nous envoyer votre candidature.
          </p>
          <div className="space-y-5">
            {CARRIERES_POSTES_A_VENIR.map((posting) => (
              <JobPostingCard
                key={posting.id}
                posting={posting}
                open={openId === posting.id}
                onToggle={() => handleToggle(posting.id)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-heading text-2xl font-bold mb-8 text-center">
            Pourquoi rejoindre E-Samba ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVANTAGES.map((avantage) => (
              <div
                key={avantage}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-primary font-bold shrink-0">✓</span>
                {avantage}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 text-center">
        <div className="container mx-auto px-4 max-w-xl">
          <h2 className="font-heading text-xl font-bold mb-3">
            Pas le bon poste pour vous ?
          </h2>
          <p className="text-muted-foreground text-sm mb-5">
            Envoyez une candidature spontanée. Nous gardons tous les profils pertinents
            en base et revenons vers vous dès qu'une opportunité se présente.
          </p>
          <a
            href={buildMailtoHref(DEPARTMENT_EMAILS.rh, {
              subject: "Candidature spontanée",
            })}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
          >
            Envoyer ma candidature
          </a>
        </div>
      </section>
    </PublicPageLayout>
  );
}
