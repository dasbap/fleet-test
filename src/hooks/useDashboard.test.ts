import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboard } from "@/hooks/useDashboard";
import type { DashboardAlert } from "@/types/dashboard";
import { createQueryClientWrapper } from "@/test/utils";

const { mockGetSession, mockAuthUnsubscribe } = vi.hoisted(() => ({
  mockGetSession: vi.fn().mockResolvedValue({
    data: { session: { access_token: "test-token" } },
  }),
  mockAuthUnsubscribe: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: mockAuthUnsubscribe } },
      })),
    },
  },
}));

const {
  mockGetActiveAlerts,
  mockResolveAlert,
  mockSubscribeToAlerts,
  mockUnsubscribe,
  mockMapRealtimePayloadToAlert,
} = vi.hoisted(() => ({
  mockGetActiveAlerts: vi.fn(),
  mockResolveAlert: vi.fn(),
  mockSubscribeToAlerts: vi.fn(),
  mockUnsubscribe: vi.fn(),
  mockMapRealtimePayloadToAlert: vi.fn(),
}));

vi.mock("@/services/dashboard-alert.service", () => ({
  DashboardAlertService: vi.fn().mockImplementation(() => ({
    getActiveAlerts: mockGetActiveAlerts,
    resolveAlert: mockResolveAlert,
    subscribeToAlerts: mockSubscribeToAlerts,
    unsubscribe: mockUnsubscribe,
    mapRealtimePayloadToAlert: mockMapRealtimePayloadToAlert,
  })),
}));

vi.mock("@/repositories/dashboard-alert.repository", () => ({
  DashboardAlertRepository: vi.fn(),
}));

vi.mock("@/hooks/useFunnelTelemetry", () => ({
  useTrackFunnelEvent: vi.fn(() => ({
    trackEvent: vi.fn(),
  })),
}));

const baseAlert: DashboardAlert = {
  id: "a1",
  vehicleId: "veh-1",
  plate: "AB-123-CD",
  vehicleName: "Toyota Hilux",
  severity: "critical",
  type: "oil",
  message: "Vidange urgente",
  createdAt: "2026-04-10T10:00:00Z",
  resolvedAt: null,
  action: {
    kind: "schedule",
    label: "Planifier",
    payload: {},
  },
};

describe("useDashboard", () => {
  const wrapper = createQueryClientWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveAlerts.mockResolvedValue([baseAlert]);
    mockResolveAlert.mockResolvedValue(undefined);
    mockSubscribeToAlerts.mockReturnValue({ id: "channel-1" });
    mockMapRealtimePayloadToAlert.mockImplementation((p: unknown) => p as DashboardAlert);
  });

  it("retire l'alerte optimistement puis rollback en cas d'échec", async () => {
    mockResolveAlert.mockRejectedValueOnce(new Error("Echec backend"));
    const { result } = renderHook(() => useDashboard("org-1"), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.resolveAlert(baseAlert.id, baseAlert.action);
      }),
    ).rejects.toThrow("Echec backend");

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].id).toBe(baseAlert.id);
  });

  it("sans SharedWorker, souscrit au channel Realtime classique (fallback)", async () => {
    const { result } = renderHook(() => useDashboard("org-1"), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSubscribeToAlerts).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        onInsert: expect.any(Function),
        onUpdate: expect.any(Function),
      }),
    );
  });

  it("avec SharedWorker, n'utilise pas subscribeToAlerts sur le thread principal", async () => {
    class MockSharedWorker {
      port = {
        start: vi.fn(),
        postMessage: vi.fn(),
        onmessage: null as unknown,
        onmessageerror: null as unknown,
      };

      constructor(_url: URL, _opts?: unknown) {}
    }

    vi.stubGlobal("SharedWorker", MockSharedWorker);
    mockSubscribeToAlerts.mockClear();

    const { result } = renderHook(() => useDashboard("org-1"), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSubscribeToAlerts).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
