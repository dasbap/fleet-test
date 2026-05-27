/** Slugs de catégories du catalogue tutoriels (Guides). */
export const TUTORIAL_CATEGORY_SLUGS = [
  'creneau',
  'incident',
  'maintenance',
  'rapports',
  'parametres',
] as const;

export type TutorialCategorySlug = (typeof TUTORIAL_CATEGORY_SLUGS)[number];

/** Seuil de complétion d'une vidéo tutoriel (web + Capacitor). */
export const TUTORIAL_COMPLETION_RATIO = 0.8;
