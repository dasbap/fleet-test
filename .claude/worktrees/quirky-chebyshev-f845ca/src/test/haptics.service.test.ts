import { beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatformMock = vi.fn();
const notificationMock = vi.fn();
const impactMock = vi.fn();

vi.mock("@/lib/platform", () => ({
  isNativePlatform: () => isNativePlatformMock(),
}));

vi.mock("@capacitor/haptics", () => ({
  Haptics: {
    notification: notificationMock,
    impact: impactMock,
  },
  NotificationType: {
    Success: "SUCCESS",
    Error: "ERROR",
  },
  ImpactStyle: {
    Light: "LIGHT",
  },
}));

describe("hapticsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("n'émet pas de vibration sur web", async () => {
    isNativePlatformMock.mockReturnValue(false);
    const { hapticsService } = await import("@/services/haptics.service");

    await hapticsService.notifySuccess();
    await hapticsService.notifyError();
    await hapticsService.impactSoft();

    expect(notificationMock).not.toHaveBeenCalled();
    expect(impactMock).not.toHaveBeenCalled();
  });

  it("émet les feedbacks sur plateforme native", async () => {
    isNativePlatformMock.mockReturnValue(true);
    const { hapticsService } = await import("@/services/haptics.service");

    await hapticsService.notifySuccess();
    await hapticsService.notifyError();
    await hapticsService.impactSoft();

    expect(notificationMock).toHaveBeenCalledTimes(2);
    expect(impactMock).toHaveBeenCalledTimes(1);
  });
});
