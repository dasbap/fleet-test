import { beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatformMock = vi.fn();
const mkdirMock = vi.fn();
const readdirMock = vi.fn();
const getUriMock = vi.fn();
const writeFileMock = vi.fn();
const deleteFileMock = vi.fn();
const readFileMock = vi.fn();
const tutorialOfflineDownloadedMock = vi.fn();
const tutorialOfflinePurgedMock = vi.fn();
const tutorialOfflineChecksumFailedMock = vi.fn();
const tutorialOfflineRemovedMock = vi.fn();
const tutorialOfflinePlayedMock = vi.fn();

vi.mock("@/lib/platform", () => ({
  isNativePlatform: () => isNativePlatformMock(),
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Filesystem: {
    mkdir: mkdirMock,
    readdir: readdirMock,
    getUri: getUriMock,
    writeFile: writeFileMock,
    deleteFile: deleteFileMock,
    readFile: readFileMock,
  },
}));

vi.mock("@/lib/analytics", () => ({
  analytics: {
    tutorialOfflineDownloaded: tutorialOfflineDownloadedMock,
    tutorialOfflinePurged: tutorialOfflinePurgedMock,
    tutorialOfflineChecksumFailed: tutorialOfflineChecksumFailedMock,
    tutorialOfflineRemoved: tutorialOfflineRemovedMock,
    tutorialOfflinePlayed: tutorialOfflinePlayedMock,
  },
}));

describe("tutorialOfflineService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_TUTORIAL_OFFLINE_QUOTA_MB", "250");
    localStorage.clear();
    isNativePlatformMock.mockReturnValue(true);
    mkdirMock.mockResolvedValue(undefined);
    readdirMock.mockResolvedValue({ files: [] });
    getUriMock.mockResolvedValue({ uri: "file:///tutorials/tuto-01.mp4" });
    writeFileMock.mockResolvedValue(undefined);
    deleteFileMock.mockResolvedValue(undefined);
    readFileMock.mockResolvedValue({ data: btoa("video-content") });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => ({
          arrayBuffer: async () => new TextEncoder().encode("video-content").buffer,
        }),
      }),
    );
  });

  it("télécharge un tutoriel avec taille/checksum et tracking", async () => {
    const { tutorialOfflineService } = await import("@/services/tutorial-offline.service");

    await tutorialOfflineService.downloadTutorial({
      id: "tuto-01",
      title: "Tutoriel 01",
      description: "desc",
      durationMin: 3,
      videoUrl: "https://cdn.local/tuto-01.mp4",
      thumbUrl: "https://cdn.local/tuto-01.jpg",
    });

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(tutorialOfflineDownloadedMock).toHaveBeenCalledTimes(1);
    const metaRaw = localStorage.getItem("tutorials-offline-meta-v1");
    expect(metaRaw).toBeTruthy();
    const meta = JSON.parse(metaRaw ?? "{}");
    expect(meta["tuto-01"]?.checksumSha256).toBeTypeOf("string");
    expect(meta["tuto-01"]?.sizeBytes).toBeGreaterThan(0);
  });

  it("purge les anciens tutoriels quand le quota est dépassé", async () => {
    const quotaBytes = 250 * 1024 * 1024;
    localStorage.setItem(
      "tutorials-offline-meta-v1",
      JSON.stringify({
        "old-01": {
          tutorialId: "old-01",
          fileName: "old-01.mp4",
          downloadedAtIso: "2026-01-01T00:00:00.000Z",
          sizeBytes: quotaBytes,
          checksumSha256: "abc",
        },
      }),
    );
    const { tutorialOfflineService } = await import("@/services/tutorial-offline.service");

    await tutorialOfflineService.downloadTutorial({
      id: "tuto-02",
      title: "Tutoriel 02",
      description: "desc",
      durationMin: 3,
      videoUrl: "https://cdn.local/tuto-02.mp4",
      thumbUrl: "https://cdn.local/tuto-02.jpg",
    });

    expect(deleteFileMock).toHaveBeenCalledTimes(1);
    expect(tutorialOfflinePurgedMock).toHaveBeenCalledWith("old-01", "quota");
  });

  it("purge d'abord les tutoriels non favoris", async () => {
    vi.stubEnv("VITE_TUTORIAL_OFFLINE_QUOTA_MB", "1");
    const heavyData = "x".repeat(700_000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => ({
          arrayBuffer: async () => new TextEncoder().encode(heavyData).buffer,
        }),
      }),
    );
    localStorage.setItem(
      "tutorials-offline-favorites-v1",
      JSON.stringify(["fav-01"]),
    );
    localStorage.setItem(
      "tutorials-offline-meta-v1",
      JSON.stringify({
        "fav-01": {
          tutorialId: "fav-01",
          fileName: "fav-01.mp4",
          downloadedAtIso: "2026-01-01T00:00:00.000Z",
          sizeBytes: 700_000,
          checksumSha256: "a",
        },
        "nonfav-01": {
          tutorialId: "nonfav-01",
          fileName: "nonfav-01.mp4",
          downloadedAtIso: "2026-01-02T00:00:00.000Z",
          sizeBytes: 700_000,
          checksumSha256: "b",
        },
      }),
    );
    const { tutorialOfflineService } = await import("@/services/tutorial-offline.service");

    await tutorialOfflineService.downloadTutorial({
      id: "tuto-04",
      title: "Tutoriel 04",
      description: "desc",
      durationMin: 3,
      videoUrl: "https://cdn.local/tuto-04.mp4",
      thumbUrl: "https://cdn.local/tuto-04.jpg",
    });

    const deleteArg = deleteFileMock.mock.calls[0]?.[0]?.path as string;
    expect(deleteArg).toContain("nonfav-01.mp4");
  });

  it("détecte un checksum invalide", async () => {
    localStorage.setItem(
      "tutorials-offline-meta-v1",
      JSON.stringify({
        "tuto-03": {
          tutorialId: "tuto-03",
          fileName: "tuto-03.mp4",
          downloadedAtIso: "2026-01-01T00:00:00.000Z",
          sizeBytes: 10,
          checksumSha256: "invalid",
        },
      }),
    );
    const { tutorialOfflineService } = await import("@/services/tutorial-offline.service");

    const isOk = await tutorialOfflineService.validateChecksum("tuto-03");

    expect(isOk).toBe(false);
    expect(tutorialOfflineChecksumFailedMock).toHaveBeenCalledWith("tuto-03");
  });

  it("retourne les métriques offline agrégées", async () => {
    const { tutorialOfflineService } = await import("@/services/tutorial-offline.service");
    localStorage.setItem(
      "tutorials-offline-metrics-v1",
      JSON.stringify({
        downloadAttempts: 10,
        downloadSuccesses: 8,
        purgeCount: 3,
        checksumFailures: 2,
      }),
    );

    const metrics = await tutorialOfflineService.getOfflineMetrics();

    expect(metrics.downloadSuccessRate).toBe(0.8);
    expect(metrics.purgeCount).toBe(3);
    expect(metrics.checksumFailureRate).toBe(0.25);
  });

  it("gère les favoris de tutoriels", async () => {
    const { tutorialOfflineService } = await import("@/services/tutorial-offline.service");

    await tutorialOfflineService.setFavorite("tuto-fav", true);
    expect(await tutorialOfflineService.isFavorite("tuto-fav")).toBe(true);

    await tutorialOfflineService.setFavorite("tuto-fav", false);
    expect(await tutorialOfflineService.isFavorite("tuto-fav")).toBe(false);
  });
});
