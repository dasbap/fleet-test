import { describe, expect, it, vi } from "vitest";
import { DvirService } from "@/services/dvir.service";
import type { DvirInsertInput, DvirRepository } from "@/repositories/dvir.repository";

describe("DvirService", () => {
  it("calcule unsafe si un item critique est en défaut", async () => {
    const createMock = vi.fn<(_input: DvirInsertInput) => Promise<void>>().mockResolvedValue();
    const repository = {
      create: createMock,
      update: vi.fn(),
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

  it("met à jour avec le statut global recalculé", async () => {
    const updateMock = vi.fn<(_id: string, _input: unknown) => Promise<void>>().mockResolvedValue();
    const repository = {
      create: vi.fn(),
      update: updateMock,
      getList: vi.fn(),
      getChecklistConfig: vi.fn(),
      getById: vi.fn(),
    } as unknown as DvirRepository;
    const service = new DvirService(repository);

    await service.update({
      id: "dvir-1",
      items: { klaxon: { status: "defaut" } },
      inspectionType: "pre_trip",
      odometerKm: null,
      notes: null,
    });

    expect(updateMock).toHaveBeenCalledWith(
      "dvir-1",
      expect.objectContaining({ overall_status: "minor_issues" }),
    );
  });

  it("rejette un statut item invalide", async () => {
    const repository = {
      create: vi.fn(),
      update: vi.fn(),
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
