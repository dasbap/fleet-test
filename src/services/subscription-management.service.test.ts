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

  it("lists fleet subscriptions through the RPC", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ id: "sub-1", vehicle_count: "2", vehicles: [] }],
      error: null,
    });
    const service = new SubscriptionManagementService();

    await expect(service.listFleetSubscriptions("fleet-1")).resolves.toMatchObject([
      { id: "sub-1", vehicleCount: 2 },
    ]);
    expect(rpc).toHaveBeenCalledWith("list_fleet_subscriptions", { p_fleet_id: "fleet-1" });
  });

  it.each(["", "   "])("rejects an empty fleet id: %j", async (fleetId) => {
    const service = new SubscriptionManagementService();
    await expect(service.listFleetSubscriptions(fleetId)).rejects.toThrow(
      "L'identifiant de la flotte est requis.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps list errors", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "permission_refusee" },
    });
    const service = new SubscriptionManagementService();
    await expect(service.listFleetSubscriptions("fleet-1")).rejects.toThrow(
      "Vous n'avez pas les droits nécessaires sur cette flotte.",
    );
  });

  it("gets a subscription detail through the RPC", async () => {
    rpc.mockResolvedValueOnce({
      data: { id: "sub-1", plan_code: "pro", vehicles: [] },
      error: null,
    });
    const service = new SubscriptionManagementService();

    await expect(service.getSubscriptionDetail("sub-1")).resolves.toMatchObject({
      id: "sub-1",
      planCode: "pro",
    });
    expect(rpc).toHaveBeenCalledWith("get_subscription_detail", {
      p_subscription_id: "sub-1",
    });
  });

  it("returns null when detail RPC returns no object", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    const service = new SubscriptionManagementService();
    await expect(service.getSubscriptionDetail("sub-1")).resolves.toBeNull();
  });

  it("rejects an empty subscription id when reading detail", async () => {
    const service = new SubscriptionManagementService();
    await expect(service.getSubscriptionDetail(" ")).rejects.toThrow(
      "L'identifiant de l'abonnement est requis.",
    );
  });

  it("maps detail errors", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "abonnement_inactif" } });
    const service = new SubscriptionManagementService();
    await expect(service.getSubscriptionDetail("sub-1")).rejects.toThrow(
      "Cet abonnement n'est pas actif.",
    );
  });

  it("activates an inactive fleet subscription through the dedicated RPC", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const service = new SubscriptionManagementService();

    await service.activateSubscription("sub-inactive");

    expect(rpc).toHaveBeenCalledWith("activate_fleet_subscription", {
      p_subscription_id: "sub-inactive",
    });
  });

  it("rejects activation without a subscription id", async () => {
    const service = new SubscriptionManagementService();
    await expect(service.activateSubscription(" ")).rejects.toThrow(
      "L'identifiant de l'abonnement est requis.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps activation errors", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "permission_refusee" } });
    const service = new SubscriptionManagementService();
    await expect(service.activateSubscription("sub-1")).rejects.toThrow(
      "Vous n'avez pas les droits nécessaires sur cette flotte.",
    );
  });

  it("terminates a subscription early through the dedicated RPC", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const service = new SubscriptionManagementService();

    await service.terminateSubscriptionEarly("sub-1");

    expect(rpc).toHaveBeenCalledWith("terminate_subscription_early", {
      p_subscription_id: "sub-1",
    });
  });

  it("rejects termination without a subscription id", async () => {
    const service = new SubscriptionManagementService();
    await expect(service.terminateSubscriptionEarly("")).rejects.toThrow(
      "L'identifiant de l'abonnement est requis.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps termination errors", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "permission_refusee" } });
    const service = new SubscriptionManagementService();
    await expect(service.terminateSubscriptionEarly("sub-1")).rejects.toThrow(
      "Vous n'avez pas les droits nécessaires sur cette flotte.",
    );
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
    await expect(service.transferVehicleSubscription("   ", "sub-pro-2")).rejects.toThrow(
      "Le véhicule et l'abonnement cible sont requis.",
    );

    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["limite_vehicules_abonnements_atteinte", "Vous avez atteint la limite de véhicules autorisée par vos abonnements."],
    ["limite_vehicules_abonnement_atteinte", "Cet abonnement n'a plus d'emplacement véhicule disponible."],
    ["abonnement_standard_deja_utilise", "Cet abonnement standard est déjà associé à un véhicule."],
    ["abonnement_type_incompatible", "Ce vÃ©hicule doit rester sur un abonnement du mÃªme type."],
    ["abonnement_inactif", "Cet abonnement n'est pas actif."],
    ["abonnement_flotte_incompatible", "L'abonnement cible n'appartient pas à la même flotte."],
    ["permission_refusee", "Vous n'avez pas les droits nécessaires sur cette flotte."],
    ["unknown database error", "unknown database error"],
  ])("maps transfer error %s", async (message, expected) => {
    rpc.mockResolvedValueOnce({ data: null, error: { message } });
    const service = new SubscriptionManagementService();

    await expect(service.transferVehicleSubscription("vehicle-1", "sub-1")).rejects.toThrow(expected);
  });
});
