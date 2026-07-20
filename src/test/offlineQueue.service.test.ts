import { describe, expect, it, vi, beforeEach } from "vitest";
import { OfflineQueueService } from "@/services/offlineQueue.service";
import * as offlineStorage from "@/lib/storage/offline-queue.storage";
import type { OfflineJob } from "@/types/offline-queue";

describe("OfflineQueueService", () => {
  const service = new OfflineQueueService();

  beforeEach(() => {
    vi.spyOn(offlineStorage, "readOfflineJobs").mockResolvedValue([]);
    vi.spyOn(offlineStorage, "writeOfflineJobs").mockResolvedValue();
    vi.spyOn(global, "crypto", "get").mockReturnValue({
      randomUUID: () => "job-1",
    } as unknown as Crypto);
  });

  it("enqueueIncidentCreate ajoute un job pending", async () => {
    const spyWrite = vi.spyOn(offlineStorage, "writeOfflineJobs");

    const job = await service.enqueueIncidentCreate({
      fleetId: "fleet-1",
      vehicleId: "veh-1",
      driverUserId: "user-1",
      description: "Test offline",
      severity: "medium",
    });

    expect(job.id).toBe("job-1");
    expect(job.type).toBe("incident:create");
    expect(job.status).toBe("pending");
    expect(spyWrite).toHaveBeenCalledTimes(1);
    const written = spyWrite.mock.calls[0][0] as OfflineJob[];
    expect(written).toHaveLength(1);
    expect(written[0].id).toBe("job-1");
  });
});

