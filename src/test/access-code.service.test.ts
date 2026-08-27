import { describe, expect, it, vi } from "vitest";
import { AccessCodeService } from "@/services/access-code.service";
import type { AccessCodeRepository } from "@/repositories/access-code.repository";
import { DriverTerrainService } from "@/services/driver-terrain.service";
import type { DriverTerrainRepository } from "@/repositories/driver-terrain.repository";

const VALID_CODE = "SAMBA-INV-4F2A9C0187B6D3E1";

function createAccessCodeService() {
  const repository = {
    validate: vi.fn(),
    consume: vi.fn(),
  };
  return {
    repository,
    service: new AccessCodeService(repository as unknown as AccessCodeRepository),
  };
}

describe("AccessCodeService", () => {
  it("refuse un code au format invalide sans appeler le repository", async () => {
    const { repository, service } = createAccessCodeService();

    const result = await service.validateCode("!!!");

    expect(result).toBeNull();
    expect(repository.validate).not.toHaveBeenCalled();
  });

  it("normalise et valide un code correct via le repository", async () => {
    const { repository, service } = createAccessCodeService();
    const expected = { valid: true };
    repository.validate.mockResolvedValue(expected);

    await expect(service.validateCode(`  ${VALID_CODE.toLowerCase()}  `)).resolves.toEqual(expected);
    expect(repository.validate).toHaveBeenCalledWith(VALID_CODE);
  });

  it("refuse de consommer un code sans utilisateur", async () => {
    const { repository, service } = createAccessCodeService();

    await expect(service.consumeCode(VALID_CODE, "")).rejects.toThrow(
      "L'identifiant utilisateur est requis",
    );
    expect(repository.consume).not.toHaveBeenCalled();
  });

  it("refuse de consommer un code invalide sans appeler le repository", async () => {
    const { repository, service } = createAccessCodeService();

    await expect(service.consumeCode("invalid", "user-1")).resolves.toBeNull();
    expect(repository.consume).not.toHaveBeenCalled();
  });

  it("normalise et consomme un code valide", async () => {
    const { repository, service } = createAccessCodeService();
    const expected = { consumed: true };
    repository.consume.mockResolvedValue(expected);

    await expect(
      service.consumeCode(`  ${VALID_CODE.toLowerCase()}  `, "user-1"),
    ).resolves.toEqual(expected);
    expect(repository.consume).toHaveBeenCalledWith(VALID_CODE, "user-1");
  });

  it("expose la normalisation et les erreurs de format", () => {
    const { service } = createAccessCodeService();

    expect(service.normalize(`  ${VALID_CODE.toLowerCase()}  `)).toBe(VALID_CODE);
    expect(service.getFormatError(VALID_CODE)).toBeNull();
    expect(service.getFormatError("x")).toContain("trop court");
  });
});

describe("DriverTerrainService", () => {
  it("refuse selfCheck sans flotte", async () => {
    const service = new DriverTerrainService({} as DriverTerrainRepository);

    await expect(service.getSelfCheck("user-1", "")).rejects.toThrow(
      "Utilisateur et flotte requis",
    );
  });
});
