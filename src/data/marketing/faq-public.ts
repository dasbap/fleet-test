import type { FaqItem } from "@/types/faq";

export interface PublicFaqEntry {
  q: string;
  a: string;
}

export const PUBLIC_FAQ_ENTRIES: readonly PublicFaqEntry[] = [
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
] as const;

/** Convertit la FAQ publique au format Schema.org / composants FAQ. */
export function toPublicFaqItems(): FaqItem[] {
  return PUBLIC_FAQ_ENTRIES.map((entry, index) => ({
    id: `public-faq-${index + 1}`,
    question: entry.q,
    answer: entry.a,
  }));
}
