import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PushNotificationBridge } from "./PushNotificationBridge";

const registerTokenMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "push-test@esamba.test",
    },
  }),
}));

vi.mock("@/hooks/usePushNotifications", () => ({
  usePushNotifications: () => ({
    permission: "granted",
    deviceToken: "fcm-token-bridge-test-12345678",
    refreshPermission: vi.fn(),
  }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useRegisterNotificationToken: () => ({
    mutateAsync: registerTokenMock,
    isPending: false,
  }),
}));

vi.mock("@/lib/platform", () => ({
  isNativePlatform: () => true,
  getCapacitorPlatform: () => "android",
}));

describe("PushNotificationBridge", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    registerTokenMock.mockClear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it("enregistre le token FCM quand utilisateur connecté et deviceToken disponible", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PushNotificationBridge />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(registerTokenMock).toHaveBeenCalledTimes(1);
    });

    expect(registerTokenMock).toHaveBeenCalledWith({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      token: "fcm-token-bridge-test-12345678",
      platform: "android",
      deviceInfo: expect.objectContaining({
        userAgent: expect.any(String),
      }),
    });
  });
});
