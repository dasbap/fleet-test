export type FonctionnaliteSectionSlug = "piloter-flotte";

export interface FonctionnaliteSection {
  slug: FonctionnaliteSectionSlug;
  title: string;
  intro: string;
  promise: string;
  items: readonly string[];
}

export const FONCTIONNALITE_SECTIONS: readonly FonctionnaliteSection[] = [
  {
    slug: "piloter-flotte",
    title: "Piloter votre flotte",
    intro:
      "Une lecture claire des véhicules, des équipes et des priorités, sans exposer les méthodes internes d'E-Samba.",
    promise:
      "Le client comprend la valeur en un seul écran : moins de zones floues, des décisions plus rapides et une exploitation mieux tenue.",
    items: [
      "Samba-Fleet",
      "Samba-Fuel",
      "Samba-Care",
      "Samba-Cash",
      "Samba-Check",
      "Alertes intelligentes",
      "Scoring & KPIs",
      "Multi-flottes",
    ],
  },
] as const;

export function getFonctionnaliteSection(slug: string): FonctionnaliteSection | undefined {
  return FONCTIONNALITE_SECTIONS.find((section) => section.slug === slug);
}
