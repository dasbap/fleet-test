import type { FaqItem } from "@/types/faq";

export interface PublicFaqEntry {
  q: string;
  a: string;
}

export const PUBLIC_FAQ_ENTRIES: readonly PublicFaqEntry[] = [
  {
    q: "À qui s'adresse E-Samba ?",
    a: "E-Samba s'adresse aux propriétaires, gestionnaires et équipes terrain qui veulent mieux suivre leurs véhicules, leurs conducteurs et leurs opérations sans multiplier les fichiers, appels et messages dispersés.",
  },
  {
    q: "Qu'est-ce que je peux suivre avec E-Samba ?",
    a: "Vous gardez une vue claire sur les véhicules, les équipes, les alertes, le carburant, l'entretien et les principaux mouvements financiers. Le site reste volontairement général : la démo permet de voir ce qui correspond à votre organisation.",
  },
  {
    q: "Est-ce adapté aux flottes en Afrique centrale ?",
    a: "Oui. E-Samba est pensé pour les usages de terrain en Afrique centrale : plusieurs pays, plusieurs équipes, connectivité variable et besoin de décisions rapides au quotidien.",
  },
  {
    q: "Combien de temps faut-il pour démarrer ?",
    a: "Le démarrage peut être rapide sur une petite flotte. Pour une organisation plus large, l'équipe vous accompagne afin de cadrer les véhicules, les rôles et les priorités avant la mise en route.",
  },
  {
    q: "Puis-je commencer avec une petite flotte ?",
    a: "Oui. Vous pouvez commencer avec quelques véhicules, valider l'intérêt pour votre équipe, puis élargir progressivement quand les usages sont clairs.",
  },
  {
    q: "Comment se déroule la mise en place ?",
    a: "Après votre demande, l'équipe prend contact pour comprendre votre flotte, votre zone d'activité, vos contraintes terrain et vos objectifs. La mise en place est adaptée à votre contexte plutôt qu'à un parcours générique.",
  },
  {
    q: "Mes données restent-elles protégées ?",
    a: "Oui. L'accès aux informations est encadré par rôle et par organisation. Les données de votre flotte ne sont pas exposées aux autres clients, et les informations sensibles restent limitées aux personnes autorisées.",
  },
  {
    q: "Comment demander une démo ?",
    a: "Utilisez la page contact et renseignez les informations demandées. L'équipe commerciale revient vers vous pour qualifier votre besoin et vous accorder un compte sous 48h.",
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
