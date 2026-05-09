import { beforeEach, describe, expect, it } from "vitest";
import {
  getOfflineCacheSnapshot,
  saveIncidentDeclarationDraft,
  setLocalSyncDisplayStatus,
} from "@/lib/storage/flotteEsambaLocalCache";
import { storageRemoveByPrefix } from "@/lib/storage/localStorageService";
import { STORAGE_PREFIX } from "@/lib/storage/storageKeys";

describe("flotteEsambaLocalCache snapshot stability", () => {
  beforeEach(() => {
    storageRemoveByPrefix(STORAGE_PREFIX);
  });

  it("retourne la meme reference si l'etat n'a pas change", () => {
    const first = getOfflineCacheSnapshot();
    const second = getOfflineCacheSnapshot();

    expect(second).toBe(first);
  });

  it("retourne une nouvelle reference quand l'etat change", () => {
    const before = getOfflineCacheSnapshot();

    setLocalSyncDisplayStatus("syncing");

    const after = getOfflineCacheSnapshot();
    expect(after).not.toBe(before);
    expect(after.sync.displayStatus).toBe("syncing");
  });

  it("met a jour pendingDrafts et change la reference apres creation d'un brouillon", () => {
    const before = getOfflineCacheSnapshot();
    expect(before.pendingDrafts).toBe(0);

    saveIncidentDeclarationDraft({
      fleetId: "fleet-test",
      vehicleId: "vehicle-test",
      description: "Pneu creve",
      severity: "medium",
      latitude: null,
      longitude: null,
      evidencePath: null,
      declaredBy: "user-test",
    });

    const after = getOfflineCacheSnapshot();
    expect(after).not.toBe(before);
    expect(after.pendingDrafts).toBe(1);
  });
});
