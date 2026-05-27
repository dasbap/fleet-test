import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentMemberships,
  getCurrentProfile,
  requireRole,
} from "@/lib/auth/esamba-auth";

const {
  getUserMock,
  signOutMock,
  maybeSingleMock,
  orderMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  signOutMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  orderMock: vi.fn(),
}));

vi.mock("@/services/biometric-lock.service", () => ({
  clearBiometricLockStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
      signOut: signOutMock,
    },
    from: (table: string) => ({
      select: () => {
        if (table === "profils") {
          return {
            eq: () => ({
              maybeSingle: maybeSingleMock,
            }),
          };
        }

        return {
          eq: () => ({
            eq: () => ({
              order: orderMock,
            }),
          }),
        };
      },
    }),
  },
}));

describe("esamba-auth adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("charge le profil quand l'utilisateur est connecté", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "manager@esamba.test",
          phone: "+237600000001",
          created_at: "2026-01-01T00:00:00.000Z",
          user_metadata: {},
          app_metadata: {},
        },
      },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({
      data: {
        user_id: "user-1",
        full_name: "Manager Test",
        phone: "+237600000001",
      },
      error: null,
    });

    const profile = await getCurrentProfile();

    expect(profile).toEqual({
      user_id: "user-1",
      full_name: "Manager Test",
      phone: "+237600000001",
    });
  });

  it("retourne les adhésions actives d'un manager sur sa flotte", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-manager", user_metadata: {}, app_metadata: {} } },
      error: null,
    });
    orderMock.mockResolvedValue({
      data: [
        {
          id: "m-1",
          fleet_id: "fleet-a",
          role: "manager",
          is_active: true,
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const memberships = await getCurrentMemberships();

    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({
      fleet_id: "fleet-a",
      role: "manager",
      is_active: true,
    });
  });

  it("bloque un driver sur une ressource manager", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-driver", user_metadata: {}, app_metadata: {} } },
      error: null,
    });
    orderMock.mockResolvedValue({
      data: [
        {
          id: "m-2",
          fleet_id: "fleet-a",
          role: "driver",
          is_active: true,
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const result = await requireRole(["manager"]);

    expect(result.ok).toBe(false);
    expect(result.role).toBe("driver");
  });

  it("retourne plusieurs flottes pour un organizer", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-org", user_metadata: {}, app_metadata: {} } },
      error: null,
    });
    orderMock.mockResolvedValue({
      data: [
        {
          id: "m-3",
          fleet_id: "fleet-a",
          role: "organizer",
          is_active: true,
          created_at: "2026-01-02T00:00:00.000Z",
        },
        {
          id: "m-4",
          fleet_id: "fleet-b",
          role: "organizer",
          is_active: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const memberships = await getCurrentMemberships();

    expect(memberships.map((m) => m.fleet_id)).toEqual(["fleet-a", "fleet-b"]);
    expect(memberships.every((m) => m.role === "organizer")).toBe(true);
  });
});
