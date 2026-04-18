import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueueManager } from "../../packages/offline-core/src/queue-manager";
import { getRecentVehicles, upsertVehicleCache } from "../../packages/offline-core/src/vehicle-cache";
import type { QueueJob } from "../../packages/offline-core/src/types";

type TestJob = QueueJob<"incident:create", { fleetId: string }>;

describe("offline-core queue manager", () => {
  let jobs: TestJob[] = [];

  const manager = createQueueManager<TestJob>(
    {
      read: async () => jobs,
      write: async (next) => {
        jobs = next;
      },
    },
    {
      maxAttempts: 2,
      maxQueueSize: 5,
      schemaVersion: 1,
    },
  );

  beforeEach(() => {
    jobs = [];
    vi.spyOn(global, "crypto", "get").mockReturnValue({
      randomUUID: () => "id-fixed",
    } as unknown as Crypto);
  });

  it("enqueue crée un job pending", async () => {
    const job = await manager.enqueue({
      type: "incident:create",
      payload: { fleetId: "fleet-1" },
      entityRef: "fleet-1",
    });

    expect(job.status).toBe("pending");
    expect(jobs).toHaveLength(1);
  });

  it("markFailed passe en failed au max attempts", async () => {
    const job = await manager.enqueue({
      type: "incident:create",
      payload: { fleetId: "fleet-1" },
      entityRef: "fleet-1",
    });

    await manager.markFailed(job.id, "echec 1");
    await manager.markFailed(job.id, "echec 2");

    const [updated] = jobs;
    expect(updated.status).toBe("failed");
    expect(updated.nextRetryAt).toBeNull();
  });

  it("flush traite dans l’ordre FIFO", async () => {
    await manager.enqueue({
      type: "incident:create",
      payload: { fleetId: "fleet-1" },
      entityRef: "fleet-1",
    });
    await manager.enqueue({
      type: "incident:create",
      payload: { fleetId: "fleet-2" },
      entityRef: "fleet-2",
    });

    const seen: string[] = [];
    const result = await manager.flush(async (job) => {
      seen.push(job.payload.fleetId);
      return true;
    });

    expect(seen).toEqual(["fleet-1", "fleet-2"]);
    expect(result.processed).toBe(2);
  });
});

describe("offline-core vehicle cache", () => {
  it("upsert applique une logique LRU bornée", () => {
    const vehicles = upsertVehicleCache(
      [
        {
          id: "v1",
          plate: "AA-001",
          brand: "Toyota",
          model: "Corolla",
          status: "ok",
          km: 1000,
          blurhash: null,
          cachedAt: new Date(Date.now() - 10_000).toISOString(),
        },
      ],
      {
        id: "v2",
        plate: "AA-002",
        brand: "Kia",
        model: "Rio",
        status: "ok",
        km: 2000,
        blurhash: null,
      },
      2,
    );

    expect(vehicles.map((item) => item.id)).toEqual(["v2", "v1"]);
  });

  it("getRecentVehicles filtre sur la fenêtre horaire", () => {
    const recent = getRecentVehicles(
      [
        {
          id: "v1",
          plate: "AA-001",
          brand: "Toyota",
          model: "Corolla",
          status: "ok",
          km: 1000,
          blurhash: null,
          cachedAt: new Date().toISOString(),
        },
        {
          id: "v2",
          plate: "AA-002",
          brand: "Kia",
          model: "Rio",
          status: "ok",
          km: 2000,
          blurhash: null,
          cachedAt: new Date(Date.now() - 30 * 3_600_000).toISOString(),
        },
      ],
      24,
    );

    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe("v1");
  });
});
