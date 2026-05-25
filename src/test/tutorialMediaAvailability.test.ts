import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkVideoAvailable,
  clearVideoAvailabilityCache,
  getCachedVideoAvailability,
} from "@/features/tutorials/lib/tutorialMediaAvailability";

describe("tutorialMediaAvailability", () => {
  afterEach(() => {
    clearVideoAvailabilityCache();
    vi.restoreAllMocks();
  });

  it("retourne true si HEAD est ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
    await expect(checkVideoAvailable("https://example.com/v.mp4")).resolves.toBe(true);
  });

  it("retourne false si HEAD et GET échouent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 }),
    );
    await expect(checkVideoAvailable("https://example.com/v.mp4")).resolves.toBe(false);
  });

  it("met en cache le résultat", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 }),
    );
    const first = await getCachedVideoAvailability("tuto-01", "https://x/v.mp4");
    const second = await getCachedVideoAvailability("tuto-01", "https://x/v.mp4");
    expect(first).toBe(false);
    expect(second).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
