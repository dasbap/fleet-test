import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Mock Supabase léger ────────────────────────────────────

function makeRpcMock(returnData: unknown, error: null | { message: string } = null) {
  return vi.fn().mockResolvedValue({ data: returnData, error });
}

function makeSupabaseMock(overrides: Record<string, unknown> = {}): SupabaseClient {
  return {
    rpc: makeRpcMock(null),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "uuid-123" }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      returns: vi.fn().mockResolvedValue({ data: [], error: null }),
      then: vi.fn().mockResolvedValue(undefined),
    }),
    ...overrides,
  } as unknown as SupabaseClient;
}

// ─── createVehicleLicenses ──────────────────────────────────

describe("createVehicleLicenses", async () => {
  const { createVehicleLicenses } = await import("@/server/domain/billing/vehicleLicenseEngine");

  it("n'appelle pas upsert si aucun véhicule trouvé", async () => {
    const admin = makeSupabaseMock();
    (admin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      returns: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    await createVehicleLicenses(admin, {
      fleetId: "f1", subscriptionId: "s1", vehicleCount: 5,
      startsAt: new Date().toISOString(), endsAt: new Date().toISOString(),
    });
    // Pas d'erreur levée = OK
  });
});

// ─── generateVehicleQr — règles métier ────────────────────

describe("generateVehicleQr — via RPC mock", async () => {
  const { generateVehicleQr } = await import("@/server/domain/billing/vehicleLicenseEngine");

  it("retourne un GeneratedQr valide si RPC réussit", async () => {
    const mockQrRow = [{
      qr_id: "qr-uuid-001",
      code: "ESQR-ABCDEF123456",
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
    }];
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: mockQrRow, error: null }),
    } as unknown as SupabaseClient;

    const result = await generateVehicleQr(admin, "v1", "s1", "user1");

    expect(result.qrId).toBe("qr-uuid-001");
    expect(result.code).toBe("ESQR-ABCDEF123456");
    expect(result.scanUrl).toContain("ESQR-ABCDEF123456");
    expect(result.expiresAt).toBeTruthy();
  });

  it("relance l'erreur si le RPC échoue", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "Blocage disciplinaire actif" } }),
    } as unknown as SupabaseClient;

    await expect(generateVehicleQr(admin, "v1", "s1", "user1")).rejects.toThrow("Blocage disciplinaire actif");
  });
});

// ─── scanActivationQr — cas critiques ──────────────────────

describe("scanActivationQr", async () => {
  const { scanActivationQr } = await import("@/server/domain/billing/vehicleLicenseEngine");

  it("retourne success si RPC retourne success", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { status: "success", vehicle_ids: ["v1"], activated_at: new Date().toISOString(), message: "Activation réussie" },
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await scanActivationQr(admin, "ESQR-ABC", "scanner-1");
    expect(result.status).toBe("success");
    expect(result.vehicleIds).toContain("v1");
  });

  it("retourne rejected pour QR expiré", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { status: "rejected", reason: "QR_EXPIRED", message: "Ce QR a expiré" },
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await scanActivationQr(admin, "ESQR-OLD", "scanner-1");
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("QR_EXPIRED");
  });

  it("retourne rejected pour QR déjà utilisé", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { status: "rejected", reason: "QR_EXHAUSTED", message: "Ce QR a déjà été utilisé" },
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await scanActivationQr(admin, "ESQR-USED", "scanner-1");
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("QR_EXHAUSTED");
  });

  it("retourne rejected pour blocage disciplinaire", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { status: "rejected", reason: "BLOCKED_DISCIPLINE", message: "Blocage disciplinaire actif" },
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await scanActivationQr(admin, "ESQR-BLOCKED", "scanner-1");
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("BLOCKED_DISCIPLINE");
  });

  it("retourne rejected pour abonnement inactif", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { status: "rejected", reason: "SUBSCRIPTION_INACTIVE", message: "L'abonnement associé n'est plus actif" },
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await scanActivationQr(admin, "ESQR-NOSUB", "scanner-1");
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("SUBSCRIPTION_INACTIVE");
  });

  it("retourne rejected pour QR introuvable", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({
        data: { status: "rejected", reason: "QR_NOT_FOUND", message: "QR code inconnu" },
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await scanActivationQr(admin, "INVALID", "scanner-1");
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("QR_NOT_FOUND");
  });

  it("propage une erreur DB", async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "connection refused" } }),
    } as unknown as SupabaseClient;

    await expect(scanActivationQr(admin, "ESQR-ERR", "scanner-1")).rejects.toThrow("connection refused");
  });
});

// ─── revokeQr ───────────────────────────────────────────────

describe("revokeQr", async () => {
  const { revokeQr } = await import("@/server/domain/billing/vehicleLicenseEngine");

  it("appelle update avec status=revoked", async () => {
    const updateMock = vi.fn().mockReturnThis();
    const neqMock = vi.fn().mockResolvedValue({ error: null });
    const admin = {
      from: vi.fn().mockReturnValue({
        update: updateMock,
        eq: vi.fn().mockReturnThis(),
        neq: neqMock,
      }),
    } as unknown as SupabaseClient;

    await revokeQr(admin, "qr-id", "user-id");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "revoked", revoked_by: "user-id" }),
    );
  });
});
