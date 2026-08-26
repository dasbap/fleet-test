import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubscriptionManagementService } from "./subscription-management.service";

const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

describe("SubscriptionManagementService", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("activates an inactive fleet subscription through the dedicated RPC", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const service = new SubscriptionManagementService();

    await service.activateSubscription("sub-inactive");

    expect(rpc).toHaveBeenCalledWith("activate_fleet_subscription", {
      p_subscription_id: "sub-inactive",
    });
  });

  it("transfers a vehicle to the selected subscription through the dedicated RPC", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const service = new SubscriptionManagementService();

    await service.transferVehicleSubscription("vehicle-1", "sub-pro-2");

    expect(rpc).toHaveBeenCalledWith("transfer_vehicle_subscription", {
      p_vehicle_id: "vehicle-1",
      p_target_subscription_id: "sub-pro-2",
    });
  });

  it("rejects a transfer when vehicle or target subscription is missing", async () => {
    const service = new SubscriptionManagementService();

    await expect(service.transferVehicleSubscription("", "sub-pro-2")).rejects.toThrow(
      "Le véhicule et l'abonnement cible sont requis.",
    );
    await expect(service.transferVehicleSubscription("vehicle-1", "")).rejects.toThrow(
      "Le véhicule et l'abonnement cible sont requis.",
    );

    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps a full target subscription to a clear transfer error", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "limite_vehicules_abonnement_atteinte" },
    });
    const service = new SubscriptionManagementService();

    await expect(
      service.transferVehicleSubscription("vehicle-1", "sub-full"),
    ).rejects.toThrow("Cet abonnement n'a plus d'emplacement véhicule disponible.");
  });

  it("maps an inactive target subscription to a clear transfer error", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "abonnement_inactif" },
    });
    const service = new SubscriptionManagementService();

    await expect(
      service.transferVehicleSubscription("vehicle-1", "sub-inactive"),
    ).rejects.toThrow("Cet abonnement n'est pas actif.");
  });

  it("maps a cross-fleet transfer to a clear error", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "abonnement_flotte_incompatible" },
    });
    const service = new SubscriptionManagementService();

    await expect(
      service.transferVehicleSubscription("vehicle-1", "sub-other-fleet"),
    ).rejects.toThrow("L'abonnement cible n'appartient pas à la même flotte.");
  });
});
