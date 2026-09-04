import { describe, expect, it, vi } from "vitest";
import { AdminDemoService } from "@/services/admin-demo.service";
import type { AdminDemoRepository } from "@/repositories/admin-demo.repository";
import type { AdminDemoBffRepository } from "@/repositories/admin-demo-bff.repository";
import type { CreateDemoPayload } from "@/services/admin-demo.service";

function createService(repository: Partial<AdminDemoRepository>, bffRepository: Partial<AdminDemoBffRepository>) {
  return new AdminDemoService(repository as AdminDemoRepository, bffRepository as AdminDemoBffRepository);
}

function payload(overrides: Partial<CreateDemoPayload> = {}): CreateDemoPayload {
  return {
    email: "demo@example.com",
    full_name: "Jean Dupont",
    company_name: "TransCam SARL",
    phone: "+237600000000",
    company_identifier: "RCCM-DLA-2026-B-123",
    country_code: "CM",
    account_type: "prospect",
    trial_days: 7,
    send_email: false,
    ...overrides,
  };
}

describe("AdminDemoService", () => {
  it("refuse createAccess sans token de session", async () => {
    const result = await createService({}, {}).createAccess(null, payload());
    expect(result).toEqual({ ok: false, error: "session_expirée" });
  });

  it("refuse createAccess avec email vide", async () => {
    const result = await createService({}, {}).createAccess("token", payload({ email: "   " }));
    expect(result).toEqual({ ok: false, error: "email_requis" });
  });

  it.each([
    ["full_name", "nom_complet_requis"],
    ["company_name", "entreprise_requise"],
    ["phone", "telephone_requis"],
    ["company_identifier", "identifiant_entreprise_requis"],
  ] as const)("refuse un profil client sans %s", async (field, expectedError) => {
    const result = await createService({}, {}).createAccess("token", payload({ [field]: "" }));
    expect(result).toEqual({ ok: false, error: expectedError });
  });

  it("orchestration createAccess transmet le profil complet puis genere le magic link", async () => {
    const createProspect = vi.fn().mockResolvedValue({ ok: true, user_id: "user-1" });
    const generateMagicLink = vi.fn().mockResolvedValue({ ok: true, magic_url: "https://example.com/magic" });
    const service = createService({}, { createProspect, generateMagicLink });
    const input = payload({ send_email: true });
    const result = await service.createAccess("token", input);

    expect(createProspect).toHaveBeenCalledWith("token", {
      email: "demo@example.com",
      full_name: "Jean Dupont",
      company_name: "TransCam SARL",
      phone: "+237600000000",
      company_identifier: "RCCM-DLA-2026-B-123",
      country_code: "CM",
      account_type: "prospect",
      trial_days: 7,
      send_email: true,
      permanent_access: undefined,
    });
    expect(generateMagicLink).toHaveBeenCalledWith("token", {
      user_id: "user-1",
      fleet_id: null,
      email: "demo@example.com",
      label: undefined,
    });
    expect(result).toEqual({ ok: true, user_id: "user-1", magic_url: "https://example.com/magic" });
  });

  it("ne marque pas la creation reussie si le magic link echoue", async () => {
    const createProspect = vi.fn().mockResolvedValue({ ok: true, user_id: "user-1" });
    const generateMagicLink = vi.fn().mockResolvedValue({ ok: false, error: "account_inactive" });
    const result = await createService({}, { createProspect, generateMagicLink }).createAccess("token", payload());
    expect(result).toEqual({ ok: false, user_id: "user-1", error: "account_inactive" });
  });

  it("ne marque pas la creation reussie si le magic link est absent", async () => {
    const createProspect = vi.fn().mockResolvedValue({ ok: true, user_id: "user-1" });
    const generateMagicLink = vi.fn().mockResolvedValue({ ok: true });
    const result = await createService({}, { createProspect, generateMagicLink }).createAccess("token", payload());
    expect(result).toEqual({ ok: false, user_id: "user-1", error: "creation_echouee" });
  });

  it("transmet le type de compte, la duree et l'acces permanent", async () => {
    const createProspect = vi.fn().mockResolvedValue({ ok: true, user_id: "user-1" });
    const generateMagicLink = vi.fn().mockResolvedValue({ ok: true, magic_url: "https://example.com/magic" });
    const service = createService({}, { createProspect, generateMagicLink });
    await service.createAccess("token", payload({ account_type: "investor", trial_days: 2, permanent_access: true }));
    expect(createProspect).toHaveBeenCalledWith("token", expect.objectContaining({ account_type: "investor", trial_days: 2, permanent_access: true }));
  });

  it("refuse une duree de creation demo superieure a 31 jours", async () => {
    const createProspect = vi.fn();
    const result = await createService({}, { createProspect }).createAccess("token", payload({ trial_days: 32 }));
    expect(result).toEqual({ ok: false, error: "duree_demo_max_31_jours" });
    expect(createProspect).not.toHaveBeenCalled();
  });

  it("explique quand le BFF admin local n'est pas lance", async () => {
    const createProspect = vi.fn().mockResolvedValue({ ok: false, error: "bff_route_unavailable" });
    const result = await createService({}, { createProspect }).createAccess("token", payload());
    expect(result).toEqual({ ok: false, error: "Route admin indisponible en local. Lance npm run dev:local ou active le proxy BFF." });
  });

  it("refuse de reactiver une demo avec plus de 31 jours d'extension demandee", async () => {
    const reactivateAccount = vi.fn();
    const service = createService({ reactivateAccount }, {});
    await expect(service.reactivateAccount("user-1", "admin-1", 745)).rejects.toThrow("Une demo ne peut pas depasser un mois depuis sa creation");
    expect(reactivateAccount).not.toHaveBeenCalled();
  });

  it("modifie la date de fin d'une demo via le repository", async () => {
    const updateAccountExpiration = vi.fn().mockResolvedValue({ ok: true, expires_at: "2026-08-01T12:00:00.000Z" });
    const service = createService({ updateAccountExpiration }, {});
    const result = await service.updateAccountExpiration("user-1", "admin-1", "2026-08-01T12:00:00.000Z");
    expect(updateAccountExpiration).toHaveBeenCalledWith("user-1", "admin-1", "2026-08-01T12:00:00.000Z");
    expect(result).toEqual({ ok: true, expires_at: "2026-08-01T12:00:00.000Z" });
  });

  it("supprime une demo via le repository", async () => {
    const deleteAccount = vi.fn().mockResolvedValue({ ok: true });
    const result = await createService({ deleteAccount }, {}).deleteAccount("user-1", "admin-1");
    expect(deleteAccount).toHaveBeenCalledWith("user-1", "admin-1", "suppression manuelle depuis admin UI");
    expect(result).toEqual({ ok: true });
  });

  it("change le plan d'une flotte via le repository", async () => {
    const setFleetPlan = vi.fn().mockResolvedValue({ ok: true, plan_code: "enterprise" });
    const result = await createService({ setFleetPlan }, {}).setFleetPlan("fleet-1", "admin-1", "enterprise");
    expect(setFleetPlan).toHaveBeenCalledWith("fleet-1", "admin-1", "enterprise");
    expect(result).toEqual({ ok: true, plan_code: "enterprise" });
  });

  it("propage les erreurs metier de suppression", async () => {
    const deleteAccount = vi.fn().mockResolvedValue({ ok: false, error: "last_active_organizer_required" });
    await expect(createService({ deleteAccount }, {}).deleteAccount("user-1", "admin-1"))
      .rejects.toThrow("last_active_organizer_required");
  });

  it("propage les erreurs metier de reactivation", async () => {
    const reactivateAccount = vi.fn().mockResolvedValue({ ok: false, error: "max_demo_extension_exceeded" });
    await expect(createService({ reactivateAccount }, {}).reactivateAccount("user-1", "admin-1"))
      .rejects.toThrow("max_demo_extension_exceeded");
  });

  it("propage les erreurs metier de modification d'expiration", async () => {
    const updateAccountExpiration = vi.fn().mockResolvedValue({ ok: false, error: "max_demo_extension_exceeded" });
    await expect(
      createService({ updateAccountExpiration }, {}).updateAccountExpiration(
        "user-1",
        "admin-1",
        "2026-08-01T12:00:00.000Z",
      ),
    ).rejects.toThrow("max_demo_extension_exceeded");
  });

  it("suspendAccount exige les identifiants", async () => {
    await expect(createService({}, {}).suspendAccount("", "admin")).rejects.toThrow("Identifiants utilisateur requis");
  });
});
