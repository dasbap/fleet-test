import { describe, expect, it, vi } from "vitest";
import { DvirService } from "@/services/dvir.service";
import type { DvirInsertInput, DvirRepository } from "@/repositories/dvir.repository";

describe("DvirService", () => {
  it("calcule unsafe si un item critique est en défaut", async () => {
    const createMock = vi.fn<(_input: DvirInsertInput) => Promise<void>>().mockResolvedValue();
    const repository = {
      create: createMock,
      getList: vi.fn(),
      getChecklistConfig: vi.fn(),
      getById: vi.fn(),
    } as unknown as DvirRepository;

    const service = new DvirService(repository);

    await service.create({
      fleetId: "fleet-1",
      vehicleId: "veh-1",
      inspectedBy: "user-1",
      inspectionType: "pre_trip",
      items: {
        freins_service: { status: "defaut" },
        klaxon: { status: "ok" },
      },
      notes: "  test   note ",
      odometerKm: 1200,
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        overall_status: "unsafe",
        notes: "test note",
      }),
    );
  });

  it("rejette un statut item invalide", async () => {
    const repository = {
      create: vi.fn(),
      getList: vi.fn(),
      getChecklistConfig: vi.fn(),
      getById: vi.fn(),
    } as unknown as DvirRepository;
    const service = new DvirService(repository);

    await expect(
      service.create({
        fleetId: "fleet-1",
        vehicleId: "veh-1",
        inspectedBy: "user-1",
        inspectionType: "pre_trip",
        items: {
          freins_service: { status: "ko" as never },
        },
      }),
    ).rejects.toThrow("Statut invalide");
  });
});
