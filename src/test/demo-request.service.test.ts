import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoRequestService } from "@/services/demo-request.service";
import type { DemoRequestRepository } from "@/repositories/demo-request.repository";

const verificationToken = "verified-email-token";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jean Dupont",
    email: "contact@transcam.cm",
    company: "TransCam",
    phone: "+237600000000",
    companyIdentifier: "RCCM-DLA-2024-B-123",
    countryCode: "CM",
    emailVerificationToken: verificationToken,
    ...overrides,
  };
}

describe("DemoRequestService", () => {
  const createMock = vi.fn();
  const repository = { create: createMock } as unknown as DemoRequestRepository;
  const service = new DemoRequestService(repository);

  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue(undefined);
  });

  it("normalise et envoie une demande valide avec preuve email", async () => {
    await service.submitRequest(validInput({
      name: "  Jean Dupont ",
      email: " CONTACT@TRANSCAM.CM ",
      company: " TransCam ",
      companyIdentifier: "  RCCM-DLA-2024-B-123 ",
      phone: " +237 600 000 000 ",
      countryCode: " cm ",
      emailVerificationToken: ` ${verificationToken} `,
    }));

    expect(createMock).toHaveBeenCalledWith({
      full_name: "Jean Dupont",
      email: "contact@transcam.cm",
      company: "TransCam",
      company_identifier: "RCCM-DLA-2024-B-123",
      phone: "+237600000000",
      country_code: "CM",
    }, verificationToken);
  });

  it("rejette un nom vide", async () => {
    await expect(service.submitRequest(validInput({ name: "  " }))).rejects.toThrow("Le nom est requis.");
  });

  it("rejette un email invalide", async () => {
    await expect(service.submitRequest(validInput({ email: "contact" }))).rejects.toThrow("Une adresse email valide est requise.");
  });

  it("rejette un identifiant entreprise vide", async () => {
    await expect(service.submitRequest(validInput({ companyIdentifier: " " }))).rejects.toThrow("Le numéro d'identifiant entreprise est requis.");
  });

  it("rejette un pays hors Afrique centrale", async () => {
    await expect(service.submitRequest(validInput({ countryCode: "SN" }))).rejects.toThrow("Sélectionnez un pays d'Afrique centrale.");
  });

  it("rejette une demande sans preuve de verification email", async () => {
    await expect(service.submitRequest(validInput({ emailVerificationToken: " " }))).rejects.toThrow("Vérifiez votre adresse e-mail");
  });

  it("rejette un numero qui ne correspond pas au pays", async () => {
    await expect(service.submitRequest(validInput({ phone: "+24166123456", countryCode: "CM" }))).rejects.toThrow("Le numéro doit correspondre au pays sélectionné (+237).");
  });

  it("normalise un numero local avec l'indicatif du pays", async () => {
    await service.submitRequest(validInput({ phone: "06 00 00 00 00", countryCode: "CM" }));
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ phone: "+237600000000" }), verificationToken);
  });
});
