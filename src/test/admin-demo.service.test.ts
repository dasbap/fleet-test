import { describe, expect, it, vi } from "vitest";
import { AdminDemoService } from "@/services/admin-demo.service";
import type { AdminDemoRepository } from "@/repositories/admin-demo.repository";
import type { AdminDemoBffRepository } from "@/repositories/admin-demo-bff.repository";

function createService(
  repository: Partial<AdminDemoRepository>,
  bffRepository: Partial<AdminDemoBffRepository>
) {
  return new AdminDemoService(
    repository as AdminDemoRepository,
    bffRepository as AdminDemoBffRepository
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
    expect(generateMagicLink).toHaveBeenCalledWith("token", {
      user_id: "user-1",
      fleet_id: null,
      email: "demo@example.com",
      label: undefined,
    });
    expect(result).toEqual({
      ok: true,
      user_id: "user-1",
      magic_url: "https://example.com/magic",
    });
  });

  it("transmet le type de compte et la duree sans flotte demo globale", async () => {
    const createProspect = vi.fn().mockResolvedValue({
      ok: true,
      user_id: "user-1",
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
      trial_days: 2,
      send_email: false,
      permanent_access: undefined,
    });
  });

  it("transmet l'acces permanent au BFF quand il est demande", async () => {
    const createProspect = vi.fn().mockResolvedValue({
      ok: true,
      user_id: "user-1",
    });
    const generateMagicLink = vi.fn().mockResolvedValue({
      ok: true,
      magic_url: "https://example.com/magic",
    });

    const service = createService({}, { createProspect, generateMagicLink });

    await service.createAccess("token", {
      email: "permanent@example.com",
      account_type: "prospect",
      trial_days: 7,
      send_email: false,
      permanent_access: true,
    });

    expect(createProspect).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({
        permanent_access: true,
      })
    );
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

  it("explique quand le BFF admin local n'est pas lance", async () => {
    const createProspect = vi.fn().mockResolvedValue({
      ok: false,
      error: "bff_route_unavailable",
    });
    const service = createService({}, { createProspect });

    const result = await service.createAccess("token", {
      email: "prospect@example.com",
      account_type: "prospect",
      trial_days: 7,
      send_email: false,
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Route admin indisponible en local. Lance npm run dev:local ou active le proxy BFF.",
    });
  });

  it("refuse de reactiver une demo avec plus de 31 jours d'extension demandee", async () => {
    const reactivateAccount = vi.fn();
    const service = createService({ reactivateAccount }, {});

    await expect(
      service.reactivateAccount("user-1", "admin-1", 745)
    ).rejects.toThrow(
      "Une demo ne peut pas depasser un mois depuis sa creation"
    );

    expect(reactivateAccount).not.toHaveBeenCalled();
  });

  it("modifie la date de fin d'une demo via le repository", async () => {
    const updateAccountExpiration = vi.fn().mockResolvedValue({
      ok: true,
      expires_at: "2026-08-01T12:00:00.000Z",
    });
    const service = createService({ updateAccountExpiration }, {});

    const result = await service.updateAccountExpiration(
      "user-1",
      "admin-1",
      "2026-08-01T12:00:00.000Z"
    );

    expect(updateAccountExpiration).toHaveBeenCalledWith(
      "user-1",
      "admin-1",
      "2026-08-01T12:00:00.000Z"
    );
    expect(result).toEqual({
      ok: true,
      expires_at: "2026-08-01T12:00:00.000Z",
    });
  });

  it("supprime une demo via le repository", async () => {
    const deleteAccount = vi.fn().mockResolvedValue({ ok: true });
    const service = createService({ deleteAccount }, {});

    const result = await service.deleteAccount("user-1", "admin-1");

    expect(deleteAccount).toHaveBeenCalledWith(
      "user-1",
      "admin-1",
      "suppression manuelle depuis admin UI"
    );
    expect(result).toEqual({ ok: true });
  });

  it("change le plan d'une flotte via le repository", async () => {
    const setFleetPlan = vi
      .fn()
      .mockResolvedValue({ ok: true, plan_code: "enterprise" });
    const service = createService({ setFleetPlan }, {});

    const result = await service.setFleetPlan(
      "fleet-1",
      "admin-1",
      "enterprise"
    );

    expect(setFleetPlan).toHaveBeenCalledWith(
      "fleet-1",
      "admin-1",
      "enterprise"
    );
    expect(result).toEqual({ ok: true, plan_code: "enterprise" });
  });

  it("suspendAccount exige les identifiants", async () => {
    const service = createService({}, {});

    await expect(service.suspendAccount("", "admin")).rejects.toThrow(
      "Identifiants utilisateur requis"
    );
  });
});
