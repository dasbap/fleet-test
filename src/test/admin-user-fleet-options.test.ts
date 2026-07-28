import { describe, expect, it } from "vitest";
import { buildProvisionableFleetOptions } from "@/pages/admin/AdminUsersPage";
import type { FleetMembership } from "@/types/auth";
import type { TenantOption } from "@/contexts/auth-context";

describe("admin user fleet options", () => {
  it("liste toutes les flottes possedees par un organizer", () => {
    const memberships: FleetMembership[] = [
      { id: "m1", user_id: "u1", fleet_id: "fleet-a", role: "organizer", is_active: true },
      { id: "m2", user_id: "u1", fleet_id: "fleet-b", role: "organizer", is_active: true },
      { id: "m3", user_id: "u1", fleet_id: "fleet-c", role: "driver", is_active: true },
    ];
    const tenantOptions: TenantOption[] = [
      { orgId: "org-a", fleetId: "fleet-a", fleetName: "Douala Nord", role: "organizer" },
      { orgId: "org-b", fleetId: "fleet-b", fleetName: "Yaounde Express", role: "organizer" },
    ];

    expect(buildProvisionableFleetOptions(memberships, tenantOptions)).toEqual([
      { fleetId: "fleet-a", label: "Douala Nord" },
      { fleetId: "fleet-b", label: "Yaounde Express" },
    ]);
  });
});
