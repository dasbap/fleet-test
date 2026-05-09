import { describe, expect, it, vi } from "vitest";
import { FuelService } from "@/services/fuel.service";
import { FuelRepository } from "@/repositories/fuel.repository";

describe("FuelService", () => {
  it("buildOfflinePayload valide et normalise une saisie", () => {
    const repo = new FuelRepository();
    const service = new FuelService(repo);

    const payload = service.buildOfflinePayload({
      fleetId: "fleet-1",
      vehicleId: "veh-1",
      driverUserId: "user-1",
      liters: 25,
      amountXof: 18000,
      odometerKm: 125000,
    });

    expect(payload.vehicleId).toBe("veh-1");
    expect(payload.stationName).toBeNull();
    expect(payload.receiptRef).toBeNull();
  });

  it("createWithIdempotency délègue au repository", async () => {
    const repo = new FuelRepository();
    const createSpy = vi.spyOn(repo, "create").mockResolvedValue();
    const service = new FuelService(repo);

    await service.createWithIdempotency(
      {
        fleetId: "fleet-1",
        vehicleId: "veh-1",
        driverUserId: "user-1",
        liters: 25,
        amountXof: 18000,
        odometerKm: 125000,
      },
      "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    );

    expect(createSpy).toHaveBeenCalledOnce();
  });
});
