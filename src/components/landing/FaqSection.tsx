import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "E-Samba fonctionne-t-il sans connexion internet ?",
    a: "Oui. L'application conducteur fonctionne hors ligne grâce à une synchronisation intelligente. Les données sont stockées localement et synchronisées automatiquement dès que la connexion revient — essentiel dans les zones à faible couverture réseau.",
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "MTN Mobile Money, Orange Money, et cartes bancaires Visa / Mastercard. Les paiements sont sécurisés et traités en FCFA. Vous pouvez choisir un abonnement mensuel ou trimestriel avec remise.",
  },
  {
    q: "Est-ce que je peux gérer plusieurs flottes avec un seul compte ?",
    a: "Oui, avec le plan Pro ou Enterprise. Vous pouvez superviser plusieurs flottes (filiales, agences, partenaires) depuis un tableau de bord unique — idéal pour les groupes de transport.",
  },
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "Le plan Gratuit vous permet de gérer jusqu'à 3 véhicules sans limite de durée. Pas de carte bancaire requise. Vous passez au plan payant uniquement quand vous en avez besoin.",
  },
  {
    q: "Le bot WhatsApp est-il inclus dans tous les plans ?",
    a: "Le bot WhatsApp conducteur (commandes /statut, /incident, /km) est disponible à partir du plan Starter. Il fonctionne en français, anglais et lingala.",
  },
  {
    q: "Comment sont sécurisées mes données ?",
    a: "Vos données sont hébergées sur Supabase (infrastructure AWS) avec chiffrement en transit et au repos. Chaque flotte est strictement isolée via Row Level Security (RLS) PostgreSQL — aucun opérateur ne peut voir les données d'une autre flotte.",
  },
  {
    q: "Puis-je importer mes données existantes ?",
    a: "Oui. Notre équipe vous accompagne pour importer votre parc de véhicules, vos conducteurs et votre historique depuis un fichier Excel ou CSV lors de l'onboarding.",
  },
  {
    q: "Y a-t-il un engagement minimum ?",
    a: "Non. Tous les plans sont sans engagement, avec facturation mensuelle. Vous pouvez changer de plan ou résilier à tout moment depuis votre tableau de bord.",
  },
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-muted/40 transition-colors"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="font-medium text-sm md:text-base">{q}</span>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t">
          <p className="pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 md:py-32 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mt-4 mb-4">
            Questions fréquentes
          </h2>
          <p className="text-muted-foreground">
            Tout ce que vous devez savoir avant de démarrer.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <FaqItem
              key={i}
              q={faq.q}
              a={faq.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-10">
          Une autre question ?{" "}
          <a href="#demo" className="text-primary hover:underline font-medium">
            Demandez une démo →
          </a>
        </p>
      </div>
    </section>
  );
}
