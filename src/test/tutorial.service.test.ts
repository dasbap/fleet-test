import { describe, expect, it } from "vitest";
import { TutorialRepository } from "@/repositories/tutorial.repository";
import { TutorialService } from "@/services/tutorial.service";
import { TUTORIAL_CATALOG_SEEDS } from "@/data/tutorials/catalog.seed";

describe("TutorialService", () => {
  const repository = new TutorialRepository();
  const service = new TutorialService(repository);

  it("retourne le catalogue seed en fallback", async () => {
    const items = await service.getTutorials();
    expect(items.length).toBe(TUTORIAL_CATALOG_SEEDS.length);
    expect(items[0]?.title).toBe("Ouvrir un créneau");
    expect(items[0]?.thumbUrl).toContain("tuto-01.svg");
  });

  it("rejette un id vide", async () => {
    await expect(service.getTutorialById("")).rejects.toThrow(
      "Identifiant de tutoriel invalide",
    );
  });

  it("trouve un tutoriel seed par slug", async () => {
    const item = await service.getTutorialById("tuto-03");
    expect(item.title).toContain("QR");
  });

  it("fusionne progression et favoris", () => {
    const items = repository.listFromSeed();
    const merged = service.mergeUserState(
      items,
      { "tuto-01": { position_sec: 30, completed_at: "2026-01-01T00:00:00Z" } },
      new Set(["tuto-02"]),
    );
    expect(merged.find((t) => t.id === "tuto-01")?.completed).toBe(true);
    expect(merged.find((t) => t.id === "tuto-02")?.isFavorite).toBe(true);
  });
});
