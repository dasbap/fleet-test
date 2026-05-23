import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditService, FLEET_MEMBER_AUDIT_ACTIONS } from "@/services/audit.service";
import type { AuditRepository } from "@/repositories/audit.repository";

vi.mock("@/lib/rbac/server", () => ({
  requirePermission: vi.fn().mockResolvedValue("organizer"),
}));

import { requirePermission } from "@/lib/rbac/server";

describe("AuditService", () => {
  const findByFleet = vi.fn();
  const write = vi.fn();
  const repo = { findByFleet, write } as unknown as AuditRepository;
  const service = new AuditService(repo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getFleetAuditLogs exige member.view et délègue au repository", async () => {
    findByFleet.mockResolvedValue([
      {
        id: "1",
        actor_id: "u1",
        action: "member.role_changed",
        target_id: "u2",
        fleet_id: "f1",
        metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);

    const rows = await service.getFleetAuditLogs("f1", 25);

    expect(requirePermission).toHaveBeenCalledWith("member.view", "f1");
    expect(findByFleet).toHaveBeenCalledWith("f1", {
      limit: 25,
      actions: [...FLEET_MEMBER_AUDIT_ACTIONS],
    });
    expect(rows).toHaveLength(1);
  });

  it("getFleetAuditLogs retourne [] si fleetId vide", async () => {
    const rows = await service.getFleetAuditLogs("");
    expect(rows).toEqual([]);
    expect(findByFleet).not.toHaveBeenCalled();
  });

  it("recordAction écrit via le repository", async () => {
    await service.recordAction("member.invited", "f1", { code: "INV-ABC" }, "inv-1");
    expect(write).toHaveBeenCalledWith("member.invited", "f1", { code: "INV-ABC" }, "inv-1");
  });
});
