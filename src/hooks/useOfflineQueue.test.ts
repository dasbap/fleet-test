import { describe, expect, it } from "vitest";

import { shouldAutoFlushOfflineQueueOnNetworkChange } from "@/hooks/useOfflineQueue";

describe("shouldAutoFlushOfflineQueueOnNetworkChange", () => {
  it("ne flush pas juste apres le retour d'une activite native externe", () => {
    expect(
      shouldAutoFlushOfflineQueueOnNetworkChange({
        wasOffline: true,
        nowOnline: true,
        nativeExternalActivityResumeGraceActive: true,
      }),
    ).toBe(false);
  });

  it("flush quand le reseau revient hors periode de grace native", () => {
    expect(
      shouldAutoFlushOfflineQueueOnNetworkChange({
        wasOffline: true,
        nowOnline: true,
        nativeExternalActivityResumeGraceActive: false,
      }),
    ).toBe(true);
  });
});
