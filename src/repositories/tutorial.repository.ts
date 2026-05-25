import { supabase } from "@/integrations/supabase/client";
import {
  TUTORIAL_CATALOG_SEEDS,
  type TutorialCatalogSeed,
} from "@/data/tutorials/catalog.seed";

export type TutorialProvider = "storage" | "youtube" | "vimeo";

export interface TutorialChapter {
  id: string;
  title: string;
  startSec: number;
}

export interface TutorialItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  durationSec: number;
  durationMin: number;
  categorySlug: string;
  categoryLabel: string;
  provider: TutorialProvider;
  videoUrl: string;
  thumbUrl: string;
  videoPath: string | null;
  externalUrl: string | null;
  tags: string[];
  sortOrder: number;
  chapters: TutorialChapter[];
  isPublished: boolean;
}

interface TutorialRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  duration_sec: number;
  provider: TutorialProvider;
  video_path: string | null;
  external_url: string | null;
  thumb_path: string | null;
  sort_order: number;
  is_published: boolean;
  tags: string[] | null;
  chapters: TutorialChapter[] | null;
  tutorial_categories: {
    slug: string;
    label_fr: string;
  } | null;
}

const BUCKET = "tutorials";

function storagePublicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function mapSeedToItem(seed: TutorialCatalogSeed): TutorialItem {
  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    description: seed.description,
    durationSec: seed.durationSec,
    durationMin: Math.max(1, Math.ceil(seed.durationSec / 60)),
    categorySlug: seed.categorySlug,
    categoryLabel: seed.categoryLabelFr,
    provider: seed.provider,
    videoUrl:
      seed.provider === "storage"
        ? storagePublicUrl(seed.videoPath)
        : seed.externalUrl ?? storagePublicUrl(seed.videoPath),
    thumbUrl: storagePublicUrl(seed.thumbPath),
    videoPath: seed.videoPath,
    externalUrl: seed.externalUrl,
    tags: seed.tags,
    sortOrder: seed.sortOrder,
    chapters: seed.chapters,
    isPublished: true,
  };
}

function mapRowToItem(row: TutorialRow): TutorialItem {
  const categorySlug = row.tutorial_categories?.slug ?? "parametres";
  const categoryLabel = row.tutorial_categories?.label_fr ?? "Paramètres";
  const videoPath = row.video_path;
  const thumbPath = row.thumb_path ?? `thumbs/${row.slug}.jpg`;
  const provider = row.provider ?? "storage";

  const videoUrl =
    provider === "storage" && videoPath
      ? storagePublicUrl(videoPath)
      : row.external_url ?? (videoPath ? storagePublicUrl(videoPath) : "");

  return {
    id: row.slug,
    slug: row.slug,
    title: row.title,
    description: row.description,
    durationSec: row.duration_sec,
    durationMin: Math.max(1, Math.ceil(row.duration_sec / 60)),
    categorySlug,
    categoryLabel,
    provider,
    videoUrl,
    thumbUrl: storagePublicUrl(thumbPath),
    videoPath,
    externalUrl: row.external_url,
    tags: row.tags ?? [],
    sortOrder: row.sort_order,
    chapters: row.chapters ?? [],
    isPublished: row.is_published,
  };
}

export class TutorialRepository {
  listFromSeed(): TutorialItem[] {
    return TUTORIAL_CATALOG_SEEDS.map(mapSeedToItem).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  }

  async findAllFromDb(limit = 50, offset = 0): Promise<TutorialItem[]> {
    const { data, error } = await supabase
      .from("tutorials")
      .select(
        `
        id,
        slug,
        title,
        description,
        duration_sec,
        provider,
        video_path,
        external_url,
        thumb_path,
        sort_order,
        is_published,
        tags,
        chapters,
        tutorial_categories ( slug, label_fr )
      `,
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching tutorials from DB:", error);
      return [];
    }

    return ((data ?? []) as TutorialRow[]).map(mapRowToItem);
  }

  async findAll(limit = 50, offset = 0): Promise<TutorialItem[]> {
    const fromDb = await this.findAllFromDb(limit, offset);
    if (fromDb.length > 0) return fromDb;
    return this.listFromSeed();
  }

  async findById(tutorialId: string): Promise<TutorialItem | null> {
    const normalized = tutorialId.trim();
    if (!normalized) return null;

    const { data, error } = await supabase
      .from("tutorials")
      .select(
        `
        id,
        slug,
        title,
        description,
        duration_sec,
        provider,
        video_path,
        external_url,
        thumb_path,
        sort_order,
        is_published,
        tags,
        chapters,
        tutorial_categories ( slug, label_fr )
      `,
      )
      .eq("slug", normalized)
      .eq("is_published", true)
      .maybeSingle();

    if (!error && data) {
      return mapRowToItem(data as TutorialRow);
    }

    const seed = TUTORIAL_CATALOG_SEEDS.find(
      (t) => t.id === normalized || t.slug === normalized,
    );
    return seed ? mapSeedToItem(seed) : null;
  }

  /** @deprecated Utiliser findAll — conservé pour compatibilité tests */
  list(): TutorialItem[] {
    return this.listFromSeed();
  }
}
