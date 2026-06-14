import { describe, expect, it, vi } from "vitest";
import { AccessCodeService } from "@/services/access-code.service";
import type { AccessCodeRepository } from "@/repositories/access-code.repository";
import { DriverTerrainService } from "@/services/driver-terrain.service";
import type { DriverTerrainRepository } from "@/repositories/driver-terrain.repository";

describe("AccessCodeService", () => {
  it("refuse un code au format invalide sans appeler le repository", async () => {
    const validate = vi.fn();
    const service = new AccessCodeService({ validate, consume: vi.fn() } as AccessCodeRepository);

    const result = await service.validateCode("!!!");

    expect(result).toBeNull();
    expect(validate).not.toHaveBeenCalled();
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
