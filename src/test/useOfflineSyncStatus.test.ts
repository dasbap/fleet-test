import { describe, expect, it } from "vitest";

import { deriveOfflineDisplayStatus } from "@/hooks/useOfflineSyncStatus";

describe("deriveOfflineDisplayStatus", () => {
  it("retombe à synced si le cache indique syncing mais qu'il n'y a plus d'action en attente", () => {
    expect(
      deriveOfflineDisplayStatus(
        {
          displayStatus: "syncing",
          lastSuccessfulSyncAt: null,
          lastSyncError: null,
        },
        0,
      ),
    ).toBe("synced");
  });
});
