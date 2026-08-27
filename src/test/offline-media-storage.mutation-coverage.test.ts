import { beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.fn();
const writeFile = vi.fn();
const stat = vi.fn();
const readFile = vi.fn();
const deleteFile = vi.fn();
const capacitorIsNative = vi.fn();

vi.mock("@/lib/platform", () => ({ isNativePlatform }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: capacitorIsNative } }));
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Filesystem: { writeFile, stat, readFile, deleteFile },
}));

import {
  deletePendingOfflineMedia,
  hydratePendingMediaStore,
  isOfflineMediaNative,
  loadPendingOfflineMediaAsDataUrl,
  savePendingOfflineMedia,
} from "@/services/offline-media-storage.service";

describe("offline media storage mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    isNativePlatform.mockReturnValue(false);
    capacitorIsNative.mockReturnValue(false);
    vi.spyOn(crypto, "randomUUID").mockReturnValue("media-uuid");
  });

  it("saves web media with mime-specific extensions and explicit size", async () => {
    const png = await savePendingOfflineMedia("data:image/png;base64,AAAA", "image/png", 4);
    expect(png).toEqual({ ref: "web-blob:media-uuid", mimeType: "image/png", sizeBytes: 4 });
    expect(localStorage.getItem("flotte-esamba:v1:pending-media-index")).toContain("web-blob:media-uuid");
    const loaded = await loadPendingOfflineMediaAsDataUrl(png);
    expect(loaded).toBe("data:image/png;base64,AAAA");
    await deletePendingOfflineMedia(png);
    await expect(loadPendingOfflineMediaAsDataUrl(png)).rejects.toThrow("Média local introuvable.");
  });

  it("computes web size when omitted", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("webp-id").mockReturnValueOnce("jpg-id");
    const webp = await savePendingOfflineMedia("data:image/webp;base64,ABCDEFGH", "image/webp");
    expect(webp.ref).toBe("web-blob:webp-id");
    expect(webp.sizeBytes).toBe(Math.ceil(("data:image/webp;base64,ABCDEFGH".length * 3) / 4));
    const jpg = await savePendingOfflineMedia("data:image/jpeg;base64,AAAA", "image/jpeg");
    expect(jpg.ref).toBe("web-blob:jpg-id");
  });

  it("rehydrates web media from localStorage", async () => {
    localStorage.setItem("flotte-esamba:v1:pending-media-index", JSON.stringify({ "web-blob:restored": { dataUrl: "data:image/jpeg;base64,BBBB", mimeType: "image/jpeg", sizeBytes: 3 } }));
    hydratePendingMediaStore();
    await expect(loadPendingOfflineMediaAsDataUrl({ ref: "web-blob:restored", mimeType: "image/jpeg", sizeBytes: 3 } as any)).resolves.toBe("data:image/jpeg;base64,BBBB");
  });

  it("ignores corrupted localStorage index", () => {
    localStorage.setItem("flotte-esamba:v1:pending-media-index", "{");
    expect(() => hydratePendingMediaStore()).not.toThrow();
  });

  it("saves and reads native media using filesystem", async () => {
    isNativePlatform.mockReturnValue(true);
    stat.mockResolvedValue({ size: 12 });
    readFile.mockResolvedValue({ data: "CCCC" });
    const ref = await savePendingOfflineMedia("data:image/png;base64,CCCC", "image/png");
    expect(ref).toEqual({ ref: "pending-media/media-uuid.png", mimeType: "image/png", sizeBytes: 12 });
    expect(writeFile).toHaveBeenCalledWith({ path: "pending-media/media-uuid.png", data: "CCCC", directory: "DATA", recursive: true });
    await expect(loadPendingOfflineMediaAsDataUrl(ref)).resolves.toBe("data:image/png;base64,CCCC");
    expect(readFile).toHaveBeenCalledWith({ path: ref.ref, directory: "DATA" });
  });

  it("uses base64 length if native stat size is absent", async () => {
    isNativePlatform.mockReturnValue(true);
    stat.mockResolvedValue({ size: undefined });
    const ref = await savePendingOfflineMedia("data:image/jpeg;base64,ABCDE", "image/jpeg");
    expect(ref.sizeBytes).toBe(5);
  });

  it("rejects malformed native data URLs", async () => {
    isNativePlatform.mockReturnValue(true);
    await expect(savePendingOfflineMedia("not-data", "image/jpeg")).rejects.toThrow("Format data URL invalide.");
  });

  it("rejects native refs on web", async () => {
    isNativePlatform.mockReturnValue(false);
    await expect(loadPendingOfflineMediaAsDataUrl({ ref: "pending-media/a.jpg", mimeType: "image/jpeg", sizeBytes: 1 } as any)).rejects.toThrow("Média natif indisponible hors plateforme native.");
  });

  it("deletes native files best effort", async () => {
    isNativePlatform.mockReturnValue(true);
    await deletePendingOfflineMedia({ ref: "pending-media/a.jpg", mimeType: "image/jpeg", sizeBytes: 1 } as any);
    expect(deleteFile).toHaveBeenCalledWith({ path: "pending-media/a.jpg", directory: "DATA" });
    deleteFile.mockRejectedValueOnce(new Error("gone"));
    await expect(deletePendingOfflineMedia({ ref: "pending-media/b.jpg", mimeType: "image/jpeg", sizeBytes: 1 } as any)).resolves.toBeUndefined();
  });

  it("reports capacitor native platform", () => {
    capacitorIsNative.mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(isOfflineMediaNative()).toBe(true);
    expect(isOfflineMediaNative()).toBe(false);
  });
});
