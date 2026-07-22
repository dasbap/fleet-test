import type { FaqItem } from "@/types/faq";

export interface PublicFaqEntry {
  q: string;
  a: string;
}

export const PUBLIC_FAQ_ENTRIES: readonly PublicFaqEntry[] = [
  {
    q: "A qui s'adresse E-Samba ?",
    a: "E-Samba s'adresse aux proprietaires, gestionnaires et equipes terrain qui veulent mieux suivre leurs vehicules, leurs conducteurs et leurs operations sans multiplier les fichiers, appels et messages disperses.",
  },
  {
    q: "Qu'est-ce que je peux suivre avec E-Samba ?",
    a: "Vous gardez une vue claire sur les vehicules, les equipes, les alertes, le carburant, l'entretien et les principaux mouvements financiers. Le site reste volontairement general : la demo permet de voir ce qui correspond a votre organisation.",
  },
  {
    q: "Est-ce adapte aux flottes en Afrique centrale ?",
    a: "Oui. E-Samba est pense pour les usages de terrain en Afrique centrale : plusieurs pays, plusieurs equipes, connectivite variable et besoin de decisions rapides au quotidien.",
  },
  {
    q: "Combien de temps faut-il pour demarrer ?",
    a: "Le demarrage peut etre rapide sur une petite flotte. Pour une organisation plus large, l'equipe vous accompagne afin de cadrer les vehicules, les roles et les priorites avant la mise en route.",
  },
  {
    q: "Puis-je commencer avec une petite flotte ?",
    a: "Oui. Vous pouvez commencer avec quelques vehicules, valider l'interet pour votre equipe, puis elargir progressivement quand les usages sont clairs.",
  },
  {
    q: "Comment se deroule la mise en place ?",
    a: "Apres votre demande, l'equipe prend contact pour comprendre votre flotte, votre zone d'activite, vos contraintes terrain et vos objectifs. La mise en place est adaptee a votre contexte plutot qu'a un parcours generique.",
  },
  {
    q: "Mes donnees restent-elles protegees ?",
    a: "Oui. L'acces aux informations est encadre par role et par organisation. Les donnees de votre flotte ne sont pas exposees aux autres clients, et les informations sensibles restent limitees aux personnes autorisees.",
  },
  {
    q: "Comment demander une demo ?",
    a: "Utilisez la page contact et renseignez les informations demandees. L'equipe commerciale revient vers vous pour qualifier votre besoin et vous accorder un compte sous 48h.",
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
