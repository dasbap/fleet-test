/** Catégories de signalement terrain (formulaire « Déclarer un incident »). */
export const INCIDENT_CATEGORY_VALUES = [
  'breakdown',
  'accident',
  'theft',
  'damage',
  'fire',
  'other',
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORY_VALUES)[number];

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  breakdown: 'Panne / immobilisation',
  accident: 'Accident / collision',
  theft: 'Vol / tentative',
  damage: 'Dégâts / carrosserie',
  fire: 'Incendie',
  other: 'Autre',
};

export function isIncidentCategory(value: string): value is IncidentCategory {
  return (INCIDENT_CATEGORY_VALUES as readonly string[]).includes(value);
}
