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

  it("transmet le type de compte et la duree au BFF de creation", async () => {
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

    await service.createAccess("token", {
      email: "investor@example.com",
      account_type: "investor",
      trial_days: 2,
      send_email: false,
    });

    expect(createProspect).toHaveBeenCalledWith("token", {
      email: "investor@example.com",
      account_type: "investor",
      company_name: undefined,
      fleet_id: undefined,
      trial_days: 2,
      send_email: false,
    });
  });

  it("refuse une duree de creation demo superieure a 31 jours", async () => {
    const createProspect = vi.fn();
    const service = createService({}, { createProspect });

    const result = await service.createAccess("token", {
      email: "prospect@example.com",
      account_type: "prospect",
      trial_days: 32,
      send_email: false,
    });

    expect(result).toEqual({ ok: false, error: "duree_demo_max_31_jours" });
    expect(createProspect).not.toHaveBeenCalled();
  });

  it("refuse de reactiver une demo avec plus de 31 jours d'extension demandee", async () => {
    const reactivateAccount = vi.fn();
    const service = createService({ reactivateAccount }, {});

    await expect(service.reactivateAccount("user-1", "admin-1", 745)).rejects.toThrow(
      "Une demo ne peut pas depasser un mois depuis sa creation",
    );

    expect(reactivateAccount).not.toHaveBeenCalled();
  });

  it("suspendAccount exige les identifiants", async () => {
    const service = createService({}, {});

    await expect(service.suspendAccount("", "admin")).rejects.toThrow(
      "Identifiants utilisateur requis",
    );
  });
});
