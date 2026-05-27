/**
 * Chemins et résolution des assets Storage pour les tutoriels.
 * Convention : seed `catalog.seed.ts` utilise `thumbs/{slug}.svg` ;
 * l’UI tente svg puis jpg (checklist QA mobile / assets legacy bucket).
 */

const BUCKET = "tutorials";

/** Chemin vignette par défaut (SVG en production actuelle). */
export function resolveThumbPath(slug: string, explicitPath?: string | null): string {
  if (explicitPath?.trim()) return explicitPath.trim();
  return `thumbs/${slug}.svg`;
}

/** Variantes vignette pour fallback UI (jpg legacy puis svg). */
export function thumbPathCandidates(slug: string, primaryPath?: string | null): string[] {
  const primary = resolveThumbPath(slug, primaryPath);
  const candidates = [primary];
  const jpg = `thumbs/${slug}.jpg`;
  const svg = `thumbs/${slug}.svg`;
  if (!candidates.includes(jpg)) candidates.push(jpg);
  if (!candidates.includes(svg)) candidates.push(svg);
  return candidates;
}

export function buildStoragePublicUrl(
  getPublicUrl: (path: string) => string,
  path: string,
): string {
  return getPublicUrl(path);
}

export { BUCKET as TUTORIALS_BUCKET };
