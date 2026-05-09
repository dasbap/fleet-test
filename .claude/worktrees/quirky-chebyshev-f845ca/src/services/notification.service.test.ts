import { describe, expect, it, vi } from "vitest";
import { NotificationService } from "./notification.service";
import type { NotificationRepository } from "@/repositories/notification.repository";

const createRepositoryMock = () => {
  return {
    upsertToken: vi.fn(),
    disableToken: vi.fn(),
  } as unknown as NotificationRepository;
};

describe("NotificationService", () => {
  it("valide et enregistre un token de device", async () => {
    const repo = createRepositoryMock();
    const service = new NotificationService(repo);

    await service.registerDeviceToken({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      token: "example-fcm-token-123",
      platform: "web",
      deviceInfo: { os: "web" },
    });

    expect(repo.upsertToken).toHaveBeenCalledTimes(1);
    expect(repo.upsertToken).toHaveBeenCalledWith({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      token: "example-fcm-token-123",
      platform: "web",
      deviceInfo: { os: "web" },
    });
  });

  it("rejette un userId invalide", async () => {
    const repo = createRepositoryMock();
    const service = new NotificationService(repo);

    await expect(
      service.registerDeviceToken({
        // @ts-expect-error test d'entrée invalide
        userId: "not-a-uuid",
        token: "short",
        platform: "web",
      }),
    ).rejects.toThrowError();

    expect(repo.upsertToken).not.toHaveBeenCalled();
  });

  it("désactive un token valide", async () => {
    const repo = createRepositoryMock();
    const service = new NotificationService(repo);

    await service.disableDeviceToken(" token-to-disable ");

    expect(repo.disableToken).toHaveBeenCalledWith("token-to-disable");
  });

  it("rejette la désactivation sans token", async () => {
    const repo = createRepositoryMock();
    const service = new NotificationService(repo);

    await expect(service.disableDeviceToken("   ")).rejects.toThrowError();
    expect(repo.disableToken).not.toHaveBeenCalled();
  });
});

