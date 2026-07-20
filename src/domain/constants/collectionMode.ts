/** Modes de collecte des recettes en clôture de créneau (terrain). */
export const COLLECTION_MODE_VALUES = ['cash', 'momo', 'mix'] as const;

export type CollectionMode = (typeof COLLECTION_MODE_VALUES)[number];

export const COLLECTION_MODE_LABELS: Record<CollectionMode, string> = {
  cash: 'Espèces',
  momo: 'Mobile Money',
  mix: 'Mixte',
};

export function isCollectionMode(value: string): value is CollectionMode {
  return (COLLECTION_MODE_VALUES as readonly string[]).includes(value);
}
