import { getCollection } from "astro:content";
import type { PillarKey } from "./site";
import { PILLAR_LABELS } from "./site";

/** Guides publiés, triés par date décroissante. */
export async function getPublishedGuides() {
  const all = await getCollection("guides");
  return all
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getPublishedSolutions() {
  const all = await getCollection("solutions");
  return all
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getPublishedFeatures() {
  const all = await getCollection("features");
  return all
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function guidePath(slug: string) {
  return `/guides/${slug}`;
}

export function solutionPath(slug: string) {
  return `/solutions/${slug}`;
}

export function featurePath(slug: string) {
  return `/fonctionnalites/${slug}`;
}

/** Articles du même pilier (hors entrée courante). */
export async function getRelatedByPillar(
  pillar: PillarKey,
  excludeSlug: string,
  limit = 3
) {
  const guides = await getPublishedGuides();
  return guides
    .filter(
      (g) =>
        g.data.kind === "article" &&
        g.data.pillar === pillar &&
        g.slug !== excludeSlug
    )
    .slice(0, limit);
}

export function getHubForPillar(pillar: PillarKey) {
  const hubs: Record<PillarKey, string> = {
    ia: "pilotage-flotte",
    operations: "operations-transport",
    performance: "performance-conformite-flotte",
  };
  return {
    slug: hubs[pillar],
    label: PILLAR_LABELS[pillar],
    href: guidePath(hubs[pillar]),
  };
}
