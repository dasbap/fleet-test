import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const realtimeMock = vi.hoisted(() => ({
  handleClosureInsert: vi.fn(),
  handleIncidentInsert: vi.fn(),
  handleMaintenanceInsert: vi.fn(),
  handleMaintenanceUpdate: vi.fn(),
}));

const channelState = vi.hoisted(() => ({
  handlers: new Map<string, (payload: { new?: unknown; old?: unknown }) => Promise<void>>(),
  subscribeHandler: null as ((status: string) => void) | null,
  removeChannel: vi.fn(),
}));

const channelMock = vi.hoisted(() => ({
  on: vi.fn((_: string, filter: { event: string; table: string }, callback: (payload: { new?: unknown; old?: unknown }) => Promise<void>) => {
    channelState.handlers.set(`${filter.event}:${filter.table}`, callback);
    return channelMock;
  }),
  subscribe: vi.fn((callback: (status: string) => void) => {
    channelState.subscribeHandler = callback;
    return channelMock;
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  notifyManager: { batch: (callback: () => void) => callback() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => channelMock),
    removeChannel: channelState.removeChannel,
  },
}));

vi.mock("@/repositories/realtime-fleet.repository", () => ({
  RealtimeFleetRepository: class {},
}));

vi.mock("@/services/realtime-notification.service", () => ({
  RealtimeNotificationService: class {
    handleClosureInsert = realtimeMock.handleClosureInsert;
    handleIncidentInsert = realtimeMock.handleIncidentInsert;
    handleMaintenanceInsert = realtimeMock.handleMaintenanceInsert;
    handleMaintenanceUpdate = realtimeMock.handleMaintenanceUpdate;
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { RealtimeFleetSubscriptionService } from "@/services/realtime-fleet-subscription.service";

const trigger = async (event: string, table: string, payload: { new?: unknown; old?: unknown }) => {
  const handler = channelState.handlers.get(`${event}:${table}`);
  if (!handler) throw new Error(`handler absent ${event}:${table}`);
  await handler(payload);
  await Promise.resolve();
};

describe("RealtimeFleetSubscriptionService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    channelState.handlers.clear();
    channelState.subscribeHandler = null;
    realtimeMock.handleClosureInsert.mockReset();
    realtimeMock.handleIncidentInsert.mockReset();
    realtimeMock.handleMaintenanceInsert.mockReset();
    realtimeMock.handleMaintenanceUpdate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const onToast = vi.fn();
    const service = new RealtimeFleetSubscriptionService();
    const unsubscribe = service.subscribe(
      "fleet-1",
      { invalidateQueries } as never,
      { onToast },
    );
    return { invalidateQueries, onToast, unsubscribe };
  };

  it("crée le canal et délègue une clôture avec toast et invalidations groupées", async () => {
    realtimeMock.handleClosureInsert.mockResolvedValue({
      toast: { title: "Clôture", description: "OK" },
      invalidateKeys: [["dashboard"], ["dashboard", "fleet-1"], ["closures", "fleet-1"], ["closures", "fleet-1"]],
    });
    const { invalidateQueries, onToast } = setup();

    expect(supabase.channel).toHaveBeenCalledWith("fleet-notifications-fleet-1");
    await trigger("INSERT", "clotures_creneaux", { new: { shift_id: "s1", revenue_declared: 20 } });
    await Promise.resolve();
    expect(realtimeMock.handleClosureInsert).toHaveBeenCalledWith({ shift_id: "s1", revenue_declared: 20 }, "fleet-1");
    expect(onToast).toHaveBeenCalledWith({ title: "Clôture", description: "OK" });

    await vi.advanceTimersByTimeAsync(120);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["closures", "fleet-1"] });
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });

  it("ignore une clôture sans résultat", async () => {
    realtimeMock.handleClosureInsert.mockResolvedValue(null);
    const { invalidateQueries, onToast } = setup();

    await trigger("INSERT", "clotures_creneaux", { new: { shift_id: "s1" } });
    await vi.advanceTimersByTimeAsync(200);

    expect(onToast).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it.each([
    ["speeding", "Excès de vitesse", "Un véhicule dépasse sa vitesse autorisée.", "destructive"],
    ["geofence_enter", "Alerte geofence", "Un véhicule est entre dans une zone surveillee.", "default"],
    ["geofence_exit", "Alerte geofence", "Un véhicule est sorti d'une zone surveillée.", "destructive"],
  ])("traite l'alerte %s", async (alertType, title, description, variant) => {
    const { invalidateQueries, onToast } = setup();

    await trigger("INSERT", "alertes_automatiques", {
      new: { fleet_id: "fleet-1", alert_type: alertType },
    });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(120);

    expect(onToast).toHaveBeenCalledWith({ title, description, variant });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["alerts"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["alerts-list"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("utilise le message d'alerte fourni et ignore une autre flotte", async () => {
    const { invalidateQueries, onToast } = setup();

    await trigger("INSERT", "alertes_automatiques", {
      new: { fleet_id: "other", alert_type: "speeding", message: "other" },
    });
    await trigger("INSERT", "alertes_automatiques", {
      new: { fleet_id: "fleet-1", alert_type: "speeding", message: "Trop vite" },
    });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(120);

    expect(onToast).toHaveBeenCalledTimes(1);
    expect(onToast).toHaveBeenCalledWith(expect.objectContaining({ description: "Trop vite" }));
    expect(invalidateQueries).toHaveBeenCalledTimes(3);
  });

  it("invalide les positions uniquement pour la flotte active", async () => {
    const { invalidateQueries } = setup();

    await trigger("INSERT", "vehicle_positions_latest", { new: { fleet_id: "other", vehicle_id: "v0" } });
    await trigger("INSERT", "vehicle_positions_latest", { new: { fleet_id: "fleet-1", vehicle_id: "v1" } });
    await vi.advanceTimersByTimeAsync(120);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["vehicle-positions-live", "fleet-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["enter", "Entree de zone detectee", "Le vehicule v1 est entre dans une zone.", "default"],
    ["exit", "Sortie de zone détectée", "Le véhicule v1 est sorti d'une zone.", "destructive"],
  ])("traite l'évènement geofence %s", async (eventType, title, description, variant) => {
    const { invalidateQueries, onToast } = setup();

    await trigger("INSERT", "geofence_events", {
      new: { fleet_id: "fleet-1", event_type: eventType, vehicle_id: "v1" },
    });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(120);

    expect(onToast).toHaveBeenCalledWith({ title, description, variant });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["geofence-events", "fleet-1", 10] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["alerts"] });
  });

  it("gère un véhicule geofence inconnu et ignore une autre flotte", async () => {
    const { invalidateQueries, onToast } = setup();

    await trigger("INSERT", "geofence_events", { new: { fleet_id: "other", event_type: "enter" } });
    await trigger("INSERT", "geofence_events", { new: { fleet_id: "fleet-1", event_type: "enter" } });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(120);

    expect(onToast).toHaveBeenCalledWith(expect.objectContaining({ description: "Le vehicule inconnu est entre dans une zone." }));
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });

  it("délègue incidents et maintenances, avec et sans toast", async () => {
    realtimeMock.handleIncidentInsert.mockResolvedValue({
      toast: { title: "Incident", description: "grave", variant: "destructive" },
      invalidateKeys: [["alerts"], ["incidents", "fleet-1"]],
    });
    realtimeMock.handleMaintenanceInsert.mockResolvedValue({
      toast: null,
      invalidateKeys: [["maintenance", "fleet-1"]],
    });
    realtimeMock.handleMaintenanceUpdate.mockResolvedValue({
      toast: { title: "Maintenance", description: "terminée" },
      invalidateKeys: [["recent-activity"], ["maintenance", "fleet-1"]],
    });
    const { invalidateQueries, onToast } = setup();

    await trigger("INSERT", "incidents", { new: { vehicle_id: "v1", severity: "high", description: "grave" } });
    await trigger("INSERT", "travaux_maintenance", { new: { fleet_id: "fleet-1", vehicle_id: "v1", priority: "high" } });
    await trigger("UPDATE", "travaux_maintenance", {
      new: { id: "m1", fleet_id: "fleet-1", vehicle_id: "v1", status: "ready" },
      old: { status: "in_progress" },
    });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(120);

    expect(realtimeMock.handleIncidentInsert).toHaveBeenCalledWith({ vehicle_id: "v1", severity: "high", description: "grave" }, "fleet-1");
    expect(realtimeMock.handleMaintenanceInsert).toHaveBeenCalledWith({ fleet_id: "fleet-1", vehicle_id: "v1", priority: "high" }, "fleet-1");
    expect(realtimeMock.handleMaintenanceUpdate).toHaveBeenCalledWith({
      new: { id: "m1", fleet_id: "fleet-1", vehicle_id: "v1", status: "ready" },
      old: { status: "in_progress" },
    }, "fleet-1");
    expect(onToast).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["alerts"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["incidents", "fleet-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["maintenance", "fleet-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["recent-activity"] });
  });

  it("ignore les délégations sans résultat", async () => {
    realtimeMock.handleIncidentInsert.mockResolvedValue(null);
    realtimeMock.handleMaintenanceInsert.mockResolvedValue(null);
    realtimeMock.handleMaintenanceUpdate.mockResolvedValue(null);
    const { invalidateQueries, onToast } = setup();

    await trigger("INSERT", "incidents", { new: {} });
    await trigger("INSERT", "travaux_maintenance", { new: {} });
    await trigger("UPDATE", "travaux_maintenance", { new: {}, old: {} });
    await vi.advanceTimersByTimeAsync(200);

    expect(onToast).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("journalise les états du canal et nettoie l'abonnement", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { unsubscribe, invalidateQueries } = setup();

    channelState.subscribeHandler?.("SUBSCRIBED");
    channelState.subscribeHandler?.("CHANNEL_ERROR");

    await trigger("INSERT", "vehicle_positions_latest", { new: { fleet_id: "fleet-1", vehicle_id: "v1" } });
    unsubscribe();
    await vi.advanceTimersByTimeAsync(200);

    expect(errorSpy).toHaveBeenCalledWith("❌ Real-time subscription error");
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(channelState.removeChannel).toHaveBeenCalledWith(channelMock);
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
