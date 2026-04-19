import { describe, it, expect, vi } from "vitest";
import { FleetMemberService } from "@/services/fleet-member.service";
import type { FleetMemberRepository } from "@/repositories/fleet-member.repository";

describe("FleetMemberService.getActiveMembershipsForUser", () => {
  it("déduplique par fleet_id en conservant la première ligne (ordre déjà trié côté repo)", async () => {
    const findActiveRowsForUser = vi.fn().mockResolvedValue([
      {
        id: "a1",
        user_id: "u1",
        fleet_id: "f1",
        role: "organizer" as const,
        is_active: true,
        created_at: "2026-01-02T00:00:00Z",
      },
      {
        id: "a2",
        user_id: "u1",
        fleet_id: "f1",
        role: "organizer" as const,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "b1",
        user_id: "u1",
        fleet_id: "f2",
        role: "organizer" as const,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    const repo = { findActiveRowsForUser } as unknown as FleetMemberRepository;
    const service = new FleetMemberService(repo);

    const result = await service.getActiveMembershipsForUser("u1");

    expect(findActiveRowsForUser).toHaveBeenCalledWith("u1");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.fleet_id).sort()).toEqual(["f1", "f2"]);
    expect(result.find((r) => r.fleet_id === "f1")?.id).toBe("a1");
  });
});
