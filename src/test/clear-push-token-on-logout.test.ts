import { beforeEach, describe, expect, it, vi } from "vitest";

const disableDeviceTokenMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/repositories/notification.repository", () => ({
  NotificationRepository: vi.fn(),
}));

vi.mock("@/services/notification.service", () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    disableDeviceToken: disableDeviceTokenMock,
  })),
}));

describe("clearPushTokenOnLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    disableDeviceTokenMock.mockResolvedValue(undefined);
  });

  it("ne fait rien si aucun token local", async () => {
    const { clearPushTokenOnLogout, pushNotificationService } = await import(
      "@/services/push-notification.service"
    );
    vi.spyOn(pushNotificationService, "getLastToken").mockReturnValue(null);

    await clearPushTokenOnLogout();

    expect(disableDeviceTokenMock).not.toHaveBeenCalled();
  });

  it("désactive le token FCM local en base", async () => {
    const { clearPushTokenOnLogout, pushNotificationService } = await import(
      "@/services/push-notification.service"
    );
    vi.spyOn(pushNotificationService, "getLastToken").mockReturnValue("fcm-token-logout-12345678");

    await clearPushTokenOnLogout();

    expect(disableDeviceTokenMock).toHaveBeenCalledWith("fcm-token-logout-12345678");
  });

  it("ignore les erreurs de désactivation", async () => {
    const { clearPushTokenOnLogout, pushNotificationService } = await import(
      "@/services/push-notification.service"
    );
    vi.spyOn(pushNotificationService, "getLastToken").mockReturnValue("fcm-token-logout-12345678");
    disableDeviceTokenMock.mockRejectedValue(new Error("réseau"));

    await expect(clearPushTokenOnLogout()).resolves.toBeUndefined();
  });
});
