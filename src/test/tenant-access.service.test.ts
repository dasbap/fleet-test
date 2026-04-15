import { describe, expect, it, vi } from "vitest";
import { TenantAccessService } from "@/services/tenant-access.service";
import { TenantAccessRepository } from "@/repositories/tenant-access.repository";

describe("TenantAccessService", () => {
  it("resolveUserTenants retourne les tenants actifs avec org", async () => {
    const repository = new TenantAccessRepository();
    vi.spyOn(repository, "getActiveMemberships").mockResolvedValue([
      {
        fleet_id: "fleet-1",
        role: "manager",
        is_active: true,
        flottes: { org_id: "org-1", name: "Flotte A" },
      },
      {
        fleet_id: "fleet-2",
        role: "driver",
        is_active: true,
        flottes: null,
      },
    ]);
    const service = new TenantAccessService(repository);

    const tenants = await service.resolveUserTenants("user-1");
    expect(tenants).toEqual([
      {
        orgId: "org-1",
        fleetId: "fleet-1",
        fleetName: "Flotte A",
        role: "manager",
      },
    ]);
  });

  it("canManageFleet limite aux rôles manager/organizer", () => {
    const service = new TenantAccessService(new TenantAccessRepository());
    expect(service.canManageFleet("manager")).toBe(true);
    expect(service.canManageFleet("organizer")).toBe(true);
    expect(service.canManageFleet("driver")).toBe(false);
  });
});
