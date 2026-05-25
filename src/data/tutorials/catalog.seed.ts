/**
 * Catalogue métier des tutoriels vidéo (source seed DB + fallback hors ligne).
 * Vignettes : chemin canonique `.svg` dans le seed ; à l’affichage, `thumbPathCandidates`
 * tente aussi `.jpg` (QA mobile Capacitor — voir docs/architecture/BUSINESS_RULES.md).
 */

import type { TutorialCategorySlug } from '@/domain/constants/tutorialCategories';

export type { TutorialCategorySlug };

export type TutorialProvider = "storage" | "youtube" | "vimeo";

export interface TutorialChapterSeed {
  id: string;
  title: string;
  startSec: number;
}

export interface TutorialCatalogSeed {
  id: string;
  slug: string;
  title: string;
  description: string;
  durationSec: number;
  categorySlug: TutorialCategorySlug;
  categoryLabelFr: string;
  provider: TutorialProvider;
  videoPath: string;
  thumbPath: string;
  externalUrl: string | null;
  tags: string[];
  sortOrder: number;
  chapters: TutorialChapterSeed[];
}

export const TUTORIAL_CATEGORY_SEEDS: {
  slug: TutorialCategorySlug;
  labelFr: string;
  sortOrder: number;
}[] = [
  { slug: "creneau", labelFr: "Créneaux & terrain", sortOrder: 1 },
  { slug: "incident", labelFr: "Incidents", sortOrder: 2 },
  { slug: "maintenance", labelFr: "Maintenance", sortOrder: 3 },
  { slug: "rapports", labelFr: "Rapports", sortOrder: 4 },
  { slug: "parametres", labelFr: "Paramètres", sortOrder: 5 },
];

function makeChapters(totalSec: number): TutorialChapterSeed[] {
  return [
    { id: "c1", title: "Contexte", startSec: 0 },
    {
      id: "c2",
      title: "Démonstration",
      startSec: Math.max(10, Math.floor(totalSec * 0.25)),
    },
    {
      id: "c3",
      title: "Récapitulatif",
      startSec: Math.max(20, Math.floor(totalSec * 0.8)),
    },
  ];
}

export const TUTORIAL_CATALOG_SEEDS: TutorialCatalogSeed[] = [
  {
    id: "tuto-01",
    slug: "tuto-01",
    title: "Ouvrir un créneau",
    description: "Démarrer une mission en 4 étapes terrain.",
    durationSec: 62,
    categorySlug: "creneau",
    categoryLabelFr: "Créneaux & terrain",
    provider: "storage",
    videoPath: "videos/tuto-01.mp4",
    thumbPath: "thumbs/tuto-01.svg",
    externalUrl: null,
    tags: ["créneau", "départ"],
    sortOrder: 1,
    chapters: makeChapters(62),
  },
  {
    id: "tuto-02",
    slug: "tuto-02",
    title: "Clôturer une mission",
    description: "Fermer correctement un créneau en fin de mission.",
    durationSec: 47,
    categorySlug: "creneau",
    categoryLabelFr: "Créneaux & terrain",
    provider: "storage",
    videoPath: "videos/tuto-02.mp4",
    thumbPath: "thumbs/tuto-02.svg",
    externalUrl: null,
    tags: ["retour", "clôture"],
    sortOrder: 2,
    chapters: makeChapters(47),
  },
  {
    id: "tuto-03",
    slug: "tuto-03",
    title: "Scanner un QR véhicule",
    description: "Accéder à la fiche véhicule via scan QR.",
    durationSec: 31,
    categorySlug: "creneau",
    categoryLabelFr: "Créneaux & terrain",
    provider: "storage",
    videoPath: "videos/tuto-03.mp4",
    thumbPath: "thumbs/tuto-03.svg",
    externalUrl: null,
    tags: ["QR", "scan"],
    sortOrder: 3,
    chapters: makeChapters(31),
  },
  {
    id: "tuto-04",
    slug: "tuto-04",
    title: "Signaler un incident",
    description: "Déclarer un incident avec photo et géolocalisation.",
    durationSec: 53,
    categorySlug: "incident",
    categoryLabelFr: "Incidents",
    provider: "storage",
    videoPath: "videos/tuto-04.mp4",
    thumbPath: "thumbs/tuto-04.svg",
    externalUrl: null,
    tags: ["incident", "panne"],
    sortOrder: 4,
    chapters: makeChapters(53),
  },
  {
    id: "tuto-05",
    slug: "tuto-05",
    title: "Saisir un plein carburant",
    description: "Enregistrer volume, montant et justificatif.",
    durationSec: 41,
    categorySlug: "creneau",
    categoryLabelFr: "Créneaux & terrain",
    provider: "storage",
    videoPath: "videos/tuto-05.mp4",
    thumbPath: "thumbs/tuto-05.svg",
    externalUrl: null,
    tags: ["carburant"],
    sortOrder: 5,
    chapters: makeChapters(41),
  },
  {
    id: "tuto-06",
    slug: "tuto-06",
    title: "Consulter les alertes",
    description: "Lire et prioriser les alertes maintenance.",
    durationSec: 37,
    categorySlug: "maintenance",
    categoryLabelFr: "Maintenance",
    provider: "storage",
    videoPath: "videos/tuto-06.mp4",
    thumbPath: "thumbs/tuto-06.svg",
    externalUrl: null,
    tags: ["alertes"],
    sortOrder: 6,
    chapters: makeChapters(37),
  },
  {
    id: "tuto-07",
    slug: "tuto-07",
    title: "Planifier un entretien",
    description: "Programmer une intervention avec budget.",
    durationSec: 58,
    categorySlug: "maintenance",
    categoryLabelFr: "Maintenance",
    provider: "storage",
    videoPath: "videos/tuto-07.mp4",
    thumbPath: "thumbs/tuto-07.svg",
    externalUrl: null,
    tags: ["entretien"],
    sortOrder: 7,
    chapters: makeChapters(58),
  },
  {
    id: "tuto-08",
    slug: "tuto-08",
    title: "Lire un rapport",
    description: "Analyser les rapports de flotte et exporter.",
    durationSec: 46,
    categorySlug: "rapports",
    categoryLabelFr: "Rapports",
    provider: "storage",
    videoPath: "videos/tuto-08.mp4",
    thumbPath: "thumbs/tuto-08.svg",
    externalUrl: null,
    tags: ["rapport"],
    sortOrder: 8,
    chapters: makeChapters(46),
  },
  {
    id: "tuto-09",
    slug: "tuto-09",
    title: "Inviter un collègue",
    description: "Ajouter un membre dans l'organisation.",
    durationSec: 33,
    categorySlug: "parametres",
    categoryLabelFr: "Paramètres",
    provider: "storage",
    videoPath: "videos/tuto-09.mp4",
    thumbPath: "thumbs/tuto-09.svg",
    externalUrl: null,
    tags: ["invitation"],
    sortOrder: 9,
    chapters: makeChapters(33),
  },
  {
    id: "tuto-10",
    slug: "tuto-10",
    title: "Utiliser le mode offline",
    description: "Travailler hors réseau puis synchroniser.",
    durationSec: 64,
    categorySlug: "parametres",
    categoryLabelFr: "Paramètres",
    provider: "storage",
    videoPath: "videos/tuto-10.mp4",
    thumbPath: "thumbs/tuto-10.svg",
    externalUrl: null,
    tags: ["offline", "sync"],
    sortOrder: 10,
    chapters: makeChapters(64),
  },
];

export function getTutorialSeedById(id: string): TutorialCatalogSeed | null {
  return TUTORIAL_CATALOG_SEEDS.find((t) => t.id === id || t.slug === id) ?? null;
}
