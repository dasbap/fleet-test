import { describe, expect, it } from "vitest";

import { shouldArmBiometricLockOnAppResume } from "@/hooks/useBiometricLock";

describe("shouldArmBiometricLockOnAppResume", () => {
  it("ignore le retour depuis une activite native externe comme la camera", () => {
    expect(
      shouldArmBiometricLockOnAppResume({
        fromBackground: true,
        hasSession: true,
        userId: "user-1",
        nativeExternalActivityResumeGraceActive: true,
      }),
    ).toBe(false);
  });

  it("arme le verrou sur un vrai retour d'arriere-plan", () => {
    expect(
      shouldArmBiometricLockOnAppResume({
        fromBackground: true,
        hasSession: true,
        userId: "user-1",
        nativeExternalActivityResumeGraceActive: false,
      }),
    ).toBe(true);
  });
});
