import { describe, expect, it } from "vitest";
import { getAssignableRoleOptions } from "./RolesHubScreen";
import type { MemberRow } from "@/hooks/useFleetMembers";

function member(overrides: Partial<MemberRow>): MemberRow {
  return {
    id: "membership-1",
    user_id: "user-1",
    fleet_id: "fleet-1",
    role: "driver",
    is_active: true,
    created_at: "2026-07-20T00:00:00Z",
    profile: null,
    email: null,
    full_name: null,
    phone: null,
    ...overrides,
  };
}

describe("getAssignableRoleOptions", () => {
  it("retire organizer pour un autre membre quand un organisateur actif existe deja", () => {
    const currentOrganizer = member({
      id: "membership-organizer",
      user_id: "user-organizer",
      role: "organizer",
    });
    const targetMember = member({
      id: "membership-driver",
      user_id: "user-driver",
      role: "driver",
    });

    expect(getAssignableRoleOptions(targetMember, [currentOrganizer, targetMember])).toEqual([
      "manager",
      "mechanic",
      "driver",
    ]);
  });

  it("garde organizer pour l'organisateur actif existant", () => {
    const currentOrganizer = member({
      id: "membership-organizer",
      user_id: "user-organizer",
      role: "organizer",
    });

    expect(getAssignableRoleOptions(currentOrganizer, [currentOrganizer])).toContain("organizer");
  });
});
