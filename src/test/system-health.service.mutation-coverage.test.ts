import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemHealthService } from "@/services/system-health.service";

describe("system health mutation coverage", () => {
  let repository: any;
  let fleetMembers: any;
  let service: SystemHealthService;

  beforeEach(() => {
    repository = { checkHealthRpc: vi.fn(), repairOrphanRpc: vi.fn() };
    fleetMembers = { findAll: vi.fn() };
    service = new SystemHealthService(repository, fleetMembers);
  });

  it("maps healthy and unhealthy RPC results", async () => {
    repository.checkHealthRpc.mockResolvedValueOnce({ data: { ok: true, orphan_count: 0, orphan_users: [] }, error: null });
    const healthy = await service.checkHealth("fleet");
    expect(healthy.usersWithoutMembership).toBe(0);
    expect(healthy.orphanUsers).toEqual([]);
    expect(healthy.isHealthy).toBe(true);
    expect(healthy.lastChecked).toBeInstanceOf(Date);

    const orphan = { user_id: "u1", email: "a@b.c", created_at: "2026-01-01" };
    repository.checkHealthRpc.mockResolvedValueOnce({ data: { ok: true, orphan_count: 1, orphan_users: [orphan] }, error: null });
    const unhealthy = await service.checkHealth("fleet");
    expect(unhealthy.usersWithoutMembership).toBe(1);
    expect(unhealthy.orphanUsers).toEqual([orphan]);
    expect(unhealthy.isHealthy).toBe(false);
  });

  it("uses defaults for malformed RPC payloads", async () => {
    repository.checkHealthRpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(service.checkHealth("fleet")).resolves.toEqual(expect.objectContaining({ usersWithoutMembership: 0, orphanUsers: [], isHealthy: true }));
    repository.checkHealthRpc.mockResolvedValueOnce({ data: { ok: true, orphan_count: 2, orphan_users: "bad" }, error: null });
    await expect(service.checkHealth("fleet")).resolves.toEqual(expect.objectContaining({ usersWithoutMembership: 2, orphanUsers: [], isHealthy: false }));
  });

  it("maps RPC business failures and generic errors", async () => {
    repository.checkHealthRpc.mockResolvedValueOnce({ data: { ok: false, error: "permission_denied" }, error: null });
    await expect(service.checkHealth("fleet")).rejects.toThrow("Permission refusée");
    repository.checkHealthRpc.mockResolvedValueOnce({ data: { ok: false, error: "custom" }, error: null });
    await expect(service.checkHealth("fleet")).rejects.toThrow("custom");
    repository.checkHealthRpc.mockResolvedValueOnce({ data: { ok: false }, error: null });
    await expect(service.checkHealth("fleet")).rejects.toThrow("Erreur inconnue");
    const err = { code: "500", message: "db" };
    repository.checkHealthRpc.mockResolvedValueOnce({ data: null, error: err });
    await expect(service.checkHealth("fleet")).rejects.toBe(err);
  });

  it("falls back when health RPC is undeployed", async () => {
    repository.checkHealthRpc.mockResolvedValue({ data: null, error: { code: "42883" } });
    fleetMembers.findAll.mockResolvedValueOnce([{ id: "m" }]).mockResolvedValueOnce([]);
    await expect(service.checkHealth("fleet", "u1", "u@x.test", "2025-01-01")).resolves.toEqual(expect.objectContaining({ usersWithoutMembership: 0, orphanUsers: [], isHealthy: true }));
    expect(fleetMembers.findAll).toHaveBeenCalledWith({ user_id: "u1", is_active: true });
    const missing = await service.checkHealth("fleet", "u2", "u2@x.test", "2025-02-02");
    expect(missing.usersWithoutMembership).toBe(1);
    expect(missing.orphanUsers).toEqual([{ user_id: "u2", email: "u2@x.test", created_at: "2025-02-02" }]);
    expect(missing.isHealthy).toBe(false);
  });

  it("returns healthy fallback without user id", async () => {
    const result = await service.getFallbackStatus();
    expect(result).toEqual(expect.objectContaining({ usersWithoutMembership: 0, orphanUsers: [], isHealthy: true }));
    expect(fleetMembers.findAll).not.toHaveBeenCalled();
  });

  it("fills missing fallback metadata", async () => {
    fleetMembers.findAll.mockResolvedValue([]);
    const result = await service.getFallbackStatus("u");
    expect(result.orphanUsers[0].user_id).toBe("u");
    expect(result.orphanUsers[0].email).toBe("N/A");
    expect(Number.isNaN(Date.parse(result.orphanUsers[0].created_at))).toBe(false);
  });

  it("repairs orphan memberships and reports missing RPC", async () => {
    repository.repairOrphanRpc.mockResolvedValueOnce({ error: null });
    await service.repairOrphanUser("u", "f");
    expect(repository.repairOrphanRpc).toHaveBeenCalledWith("u", "f");
    repository.repairOrphanRpc.mockResolvedValueOnce({ error: { code: "42883" } });
    await expect(service.repairOrphanUser("u", "f")).rejects.toThrow("RPC repair_orphan_membership non déployée");
    const err = { code: "500", message: "repair" };
    repository.repairOrphanRpc.mockResolvedValueOnce({ error: err });
    await expect(service.repairOrphanUser("u", "f")).rejects.toBe(err);
  });
});
