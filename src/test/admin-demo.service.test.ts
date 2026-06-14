import { describe, expect, it, vi } from "vitest";
import { AdminDemoService } from "@/services/admin-demo.service";
import type { AdminDemoRepository } from "@/repositories/admin-demo.repository";
import type { AdminDemoBffRepository } from "@/repositories/admin-demo-bff.repository";

function createService(
  repository: Partial<AdminDemoRepository>,
  bffRepository: Partial<AdminDemoBffRepository>,
) {
  return new AdminDemoService(
    repository as AdminDemoRepository,
    bffRepository as AdminDemoBffRepository,
  );
}

describe("AdminDemoService", () => {
  it("refuse createAccess sans token de session", async () => {
    const service = createService({}, {});

    const result = await service.createAccess(null, {
      email: "demo@example.com",
      account_type: "prospect",
      trial_days: 7,
      send_email: false,
    });

    expect(result).toEqual({ ok: false, error: "session_expirée" });
  });

  it("refuse createAccess avec email vide", async () => {
    const service = createService({}, {});

    const result = await service.createAccess("token", {
      email: "   ",
      account_type: "prospect",
      trial_days: 7,
      send_email: false,
    });

    expect(result).toEqual({ ok: false, error: "email_requis" });
  });

  it("orchestration createAccess : prospect puis magic link", async () => {
    const createProspect = vi.fn().mockResolvedValue({
      ok: true,
      user_id: "user-1",
      fleet_id: "fleet-1",
    });
    const generateMagicLink = vi.fn().mockResolvedValue({
      ok: true,
      magic_url: "https://example.com/magic",
    });

    const service = createService({}, { createProspect, generateMagicLink });

    const result = await service.createAccess("token", {
      email: "demo@example.com",
      account_type: "prospect",
      trial_days: 7,
      send_email: true,
    });

    expect(createProspect).toHaveBeenCalledOnce();
    expect(generateMagicLink).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true, magic_url: "https://example.com/magic" });
  });

  it("suspendAccount exige les identifiants", async () => {
    const service = createService({}, {});

    await expect(service.suspendAccount("", "admin")).rejects.toThrow(
      "Identifiants utilisateur requis",
    );
  });
});
