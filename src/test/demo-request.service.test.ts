import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoRequestService } from "@/services/demo-request.service";
import type { DemoRequestRepository } from "@/repositories/demo-request.repository";

describe("DemoRequestService", () => {
  const createMock = vi.fn();
  const repository = { create: createMock } as unknown as DemoRequestRepository;
  const service = new DemoRequestService(repository);

  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue(undefined);
  });

  it("normalise et envoie une demande valide", async () => {
    await service.submitRequest({
      name: "  Jean Dupont ",
      email: " CONTACT@TRANSCAM.CM ",
      company: " TransCam ",
      companyIdentifier: "  RCCM-DLA-2024-B-123 ",
      phone: " +237600000000 ",
      countryCode: " cm ",
    });

    expect(createMock).toHaveBeenCalledWith({
      full_name: "Jean Dupont",
      email: "contact@transcam.cm",
      company: "TransCam",
      company_identifier: "RCCM-DLA-2024-B-123",
      phone: "+237600000000",
      country_code: "CM",
    });
  });

  it("rejette un nom vide", async () => {
    await expect(
      service.submitRequest({
        name: "  ",
        email: "contact@transcam.cm",
        phone: "+237600000000",
        companyIdentifier: "RCCM-DLA-2024-B-123",
        countryCode: "CM",
      }),
    ).rejects.toThrow("Le nom est requis.");
  });

  it("rejette un email invalide", async () => {
    await expect(
      service.submitRequest({
        name: "Jean",
        email: "contact",
        phone: "+237600000000",
        companyIdentifier: "RCCM-DLA-2024-B-123",
        countryCode: "CM",
      }),
    ).rejects.toThrow("Une adresse email valide est requise.");
  });

  it("rejette un identifiant entreprise vide", async () => {
    await expect(
      service.submitRequest({
        name: "Jean",
        email: "contact@transcam.cm",
        phone: "+237600000000",
        companyIdentifier: " ",
        countryCode: "CM",
      }),
    ).rejects.toThrow("Le numéro d'identifiant entreprise est requis.");
  });

  it("rejette un pays hors Afrique centrale", async () => {
    await expect(
      service.submitRequest({
        name: "Jean",
        email: "contact@transcam.cm",
        phone: "+237600000000",
        companyIdentifier: "RCCM-DLA-2024-B-123",
        countryCode: "SN",
      }),
    ).rejects.toThrow("Sélectionnez un pays d'Afrique centrale.");
  });
});
