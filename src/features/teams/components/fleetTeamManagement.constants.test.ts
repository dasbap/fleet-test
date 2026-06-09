import { describe, it, expect } from "vitest";
import { isActiveFleetMember } from "./fleetTeamManagement.constants";

describe("isActiveFleetMember", () => {
  const members = [
    { user_id: "u1", is_active: true },
    { user_id: "u2", is_active: false },
  ];

  it("retourne true pour un membre actif", () => {
    expect(isActiveFleetMember(members, "u1")).toBe(true);
  });

  it("retourne false pour un membre retiré (inactif)", () => {
    expect(isActiveFleetMember(members, "u2")).toBe(false);
  });

  it("retourne false pour un utilisateur absent", () => {
    expect(isActiveFleetMember(members, "u-unknown")).toBe(false);
  });
});
