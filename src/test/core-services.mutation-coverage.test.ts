import { beforeEach, describe, expect, it, vi } from "vitest";

const { enqueueTutorialSync, peekTutorialSyncQueue, shiftTutorialSyncQueue } = vi.hoisted(() => ({
  enqueueTutorialSync: vi.fn(),
  peekTutorialSyncQueue: vi.fn(),
  shiftTutorialSyncQueue: vi.fn(),
}));

vi.mock("@/features/tutorials/lib/tutorialSyncQueue", () => ({
  enqueueTutorialSync,
  peekTutorialSyncQueue,
  shiftTutorialSyncQueue,
}));

import { AvatarService } from "@/services/avatar.service";
import { DashboardService } from "@/services/dashboard.service";
import { MobileMoneyService } from "@/services/mobile-money.service";
import { TutorialProgressService } from "@/services/tutorial-progress.service";
import { resolveEffectiveVehicleSlots, sumActiveSubscriptionVehicleCapacity } from "@/lib/subscription-vehicle-capacity";
import { searchAll, searchStaticIndex } from "@/services/universalSearch.service";

describe("core services mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates subscription capacities across statuses and limits", () => {
    expect(sumActiveSubscriptionVehicleCapacity([])).toBeNull();
    expect(sumActiveSubscriptionVehicleCapacity([{ status: "expired", vehicleCapacity: 12 }])).toBeNull();
    expect(sumActiveSubscriptionVehicleCapacity([{ status: "trial", vehicleCapacity: 2 }, { status: "active", vehicleCapacity: 3 }, { status: "grace_period", vehicleCapacity: -4 }])).toBe(5);
    expect(sumActiveSubscriptionVehicleCapacity([{ status: "active", vehicleCapacity: null }])).toBe(999999);
    expect(sumActiveSubscriptionVehicleCapacity([{ status: "trialing", vehicleCapacity: undefined }])).toBe(999999);
    expect(sumActiveSubscriptionVehicleCapacity([{ status: "grace", vehicleCapacity: 999999 }])).toBe(999999);
    expect(resolveEffectiveVehicleSlots({ subscriptionSlots: 8, contextSlots: 3, planMax: 5 })).toBe(5);
    expect(resolveEffectiveVehicleSlots({ subscriptionSlots: 0, contextSlots: 3, planMax: 10 })).toBe(3);
    expect(resolveEffectiveVehicleSlots({ subscriptionSlots: null, contextSlots: 0, planMax: 0 })).toBe(1);
    expect(resolveEffectiveVehicleSlots({ subscriptionSlots: 2, contextSlots: 9, planMax: 0 })).toBe(2);
  });

  it("covers dashboard guards and delegation", async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ id: "snap" }),
      getStats: vi.fn().mockResolvedValue({ vehicles: 2 }),
      getRecentActivity: vi.fn().mockResolvedValue([{ id: "a" }]),
      getFleetVehiclesOverview: vi.fn().mockResolvedValue([{ id: "v" }]),
      getMetricsCached: vi.fn().mockResolvedValue({ activeVehicles: 1 }),
      invalidateMetricsCache: vi.fn().mockResolvedValue(undefined),
    } as any;
    const service = new DashboardService(repository);
    await expect(service.getDashboardSnapshot("", "org")).rejects.toThrow("La flotte et l'organisation sont requises");
    await expect(service.getDashboardSnapshot("fleet", "")).rejects.toThrow("La flotte et l'organisation sont requises");
    await expect(service.getDashboardSnapshot("fleet", "org")).resolves.toEqual({ id: "snap" });
    expect(repository.getDashboardSnapshot).toHaveBeenCalledWith("fleet", "org");
    await expect(service.getDashboardStats("")).rejects.toThrow("L'ID de la flotte est requis");
    await expect(service.getDashboardStats("fleet")).resolves.toEqual({ vehicles: 2 });
    await expect(service.getRecentActivity("")).resolves.toEqual([]);
    await expect(service.getRecentActivity("fleet")).resolves.toEqual([{ id: "a" }]);
    await expect(service.getFleetVehiclesOverview("")).resolves.toEqual([]);
    await expect(service.getFleetVehiclesOverview("fleet")).resolves.toEqual([{ id: "v" }]);
    await expect(service.getFleetMetricsCached("")).rejects.toThrow("L'ID de la flotte est requis");
    await expect(service.getFleetMetricsCached("fleet")).resolves.toEqual({ activeVehicles: 1 });
    await expect(service.invalidateFleetMetricsCache("")).rejects.toThrow("L'ID de la flotte est requis");
    await service.invalidateFleetMetricsCache("fleet");
    expect(repository.invalidateMetricsCache).toHaveBeenCalledWith("fleet");
  });

  it("covers avatar validation upload and display resolution", async () => {
    const repository = {
      upload: vi.fn().mockResolvedValue(undefined),
      updateUserAvatarPath: vi.fn().mockResolvedValue(undefined),
      getSignedUrl: vi.fn().mockResolvedValue("https://signed.test/a"),
    } as any;
    const service = new AvatarService(repository);
    await expect(service.uploadAvatar("u", new File(["x"], "x.txt", { type: "text/plain" }))).rejects.toThrow("Veuillez sélectionner une image valide");
    await expect(service.uploadAvatar("u", new File([new Uint8Array(2 * 1024 * 1024 + 1)], "x.jpg", { type: "image/jpeg" }))).rejects.toThrow("2 Mo");
    const file = new File(["x"], "avatar.png", { type: "image/png" });
    await expect(service.uploadAvatar("u1", file)).resolves.toBe("https://signed.test/a");
    expect(repository.upload).toHaveBeenCalledWith("u1/avatar.png", file, true);
    expect(repository.updateUserAvatarPath).toHaveBeenCalledWith("u1/avatar.png");
    repository.getSignedUrl.mockResolvedValueOnce(null);
    await expect(service.uploadAvatar("u2", new File(["x"], "avatar", { type: "image/jpeg" }))).rejects.toThrow("URL introuvable après l'upload");
    await expect(service.resolveAvatarDisplayUrl(null)).resolves.toBeNull();
    await expect(service.resolveAvatarDisplayUrl("   ")).resolves.toBeNull();
    await expect(service.resolveAvatarDisplayUrl("https://cdn.test/avatar.jpg")).resolves.toBe("https://cdn.test/avatar.jpg");
    repository.getSignedUrl.mockResolvedValueOnce("https://signed.test/path");
    await expect(service.resolveAvatarDisplayUrl("u1/avatar.png")).resolves.toBe("https://signed.test/path");
  });

  it("covers mobile money repository and API flows", async () => {
    const repository = { create: vi.fn().mockResolvedValue({ id: "tx1" }), updateStatus: vi.fn().mockResolvedValue({ id: "tx1", status: "completed" }) } as any;
    const service = new MobileMoneyService(repository);
    vi.spyOn(crypto, "randomUUID").mockReturnValue("12345678-1234-1234-1234-123456789abc");
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    await expect(service.startPayment({ fleetId: "fleet", provider: "orange", amountXaf: 1000, phoneNumber: "600", merchantCode: "m" })).resolves.toEqual({ id: "tx1" });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ fleet_id: "fleet", provider: "orange", amount_xaf: 1000, reference: expect.stringMatching(/^MM-[A-Z0-9]+-1234567812341234$/) }));
    await expect(service.confirmPayment("tx1")).resolves.toEqual({ id: "tx1", status: "completed" });
    expect(repository.updateStatus).toHaveBeenLastCalledWith("tx1", "completed");
    await service.confirmPayment("tx1", false);
    expect(repository.updateStatus).toHaveBeenLastCalledWith("tx1", "failed");
    await expect(new MobileMoneyService().startPayment({} as any)).rejects.toThrow("PaymentTransactionRepository requis");
    await expect(new MobileMoneyService().confirmPayment("x")).rejects.toThrow("PaymentTransactionRepository requis");
    await expect(service.initiatePayment({} as any)).rejects.toThrow("Jeton d'accès requis");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, reference: "r" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(service.initiatePayment({ provider: "orange" } as any, { accessToken: "token" })).resolves.toEqual({ ok: true, reference: "r" });
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/mobile-money/initiate", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer token" }) }));
    fetchMock.mockResolvedValueOnce(new Response("provider down", { status: 503 }));
    await expect(service.initiatePayment({} as any, { accessToken: "token" })).rejects.toThrow("provider down");
    fetchMock.mockResolvedValueOnce({ ok: false, status: 504, text: vi.fn().mockRejectedValue(new Error("read")) });
    await expect(service.initiatePayment({} as any, { accessToken: "token" })).rejects.toThrow("Erreur API Mobile Money (504)");
    vi.unstubAllGlobals();
  });

  it("covers tutorial progress online offline and queue flush", async () => {
    const repository = {
      findProgressForUser: vi.fn().mockResolvedValue({ t1: { position: 2 } }),
      listFavoriteIds: vi.fn().mockResolvedValue(["a", "b"]),
      upsertProgress: vi.fn().mockResolvedValue(undefined),
      setFavorite: vi.fn().mockResolvedValue(undefined),
      recordView: vi.fn().mockResolvedValue(undefined),
    } as any;
    const service = new TutorialProgressService(repository);
    await expect(service.getProgressMap("u", ["t1"])).resolves.toEqual({ t1: { position: 2 } });
    await expect(service.getFavoriteIds("u")).resolves.toEqual(new Set(["a", "b"]));
    await service.saveProgress({ userId: "u", tutorialId: "t", fleetId: null, positionSec: 3, completed: false, isOnline: false });
    expect(enqueueTutorialSync).toHaveBeenCalledWith({ type: "progress", tutorialId: "t", fleetId: null, positionSec: 3, completed: false });
    await service.saveProgress({ userId: "u", tutorialId: "t", fleetId: "f", positionSec: 4, completed: true, isOnline: true });
    expect(repository.upsertProgress).toHaveBeenCalledWith({ userId: "u", tutorialId: "t", fleetId: "f", positionSec: 4, completed: true });
    await service.setFavorite({ userId: "u", tutorialId: "t", value: true, isOnline: false });
    expect(enqueueTutorialSync).toHaveBeenCalledWith({ type: "favorite", tutorialId: "t", value: true });
    await service.setFavorite({ userId: "u", tutorialId: "t", value: false, isOnline: true });
    expect(repository.setFavorite).toHaveBeenCalledWith("u", "t", false);
    await service.recordView({ userId: "u", tutorialId: "t", fleetId: null, source: "offline", watchedSec: 9, isOnline: false });
    expect(enqueueTutorialSync).toHaveBeenCalledWith({ type: "view", tutorialId: "t", fleetId: null, source: "offline", watchedSec: 9 });
    await service.recordView({ userId: "u", tutorialId: "t", fleetId: "f", source: "online", watchedSec: 10, isOnline: true });
    expect(repository.recordView).toHaveBeenCalledWith(expect.objectContaining({ userId: "u", tutorialId: "t", watchedSec: 10 }));
    shiftTutorialSyncQueue.mockReturnValueOnce({ type: "progress", tutorialId: "p", fleetId: null, positionSec: 1, completed: false }).mockReturnValueOnce({ type: "favorite", tutorialId: "q", value: true }).mockReturnValueOnce({ type: "view", tutorialId: "r", fleetId: null, source: "offline", watchedSec: 2 }).mockReturnValueOnce(undefined);
    await expect(service.flushSyncQueue("u", "fallback")).resolves.toBe(3);
    expect(repository.upsertProgress).toHaveBeenCalledWith(expect.objectContaining({ fleetId: "fallback" }));
    expect(repository.setFavorite).toHaveBeenCalledWith("u", "q", true);
    expect(repository.recordView).toHaveBeenCalledWith(expect.objectContaining({ fleetId: "fallback", tutorialId: "r" }));
    shiftTutorialSyncQueue.mockReset().mockReturnValueOnce({ type: "favorite", tutorialId: "x", value: true }).mockReturnValueOnce(undefined);
    repository.setFavorite.mockRejectedValueOnce(new Error("fail"));
    await expect(service.flushSyncQueue("u", null)).resolves.toBe(0);
    peekTutorialSyncQueue.mockReturnValue([1, 2, 3]);
    expect(service.getPendingSyncCount()).toBe(3);
  });

  it("covers universal search normalization filtering and static index", async () => {
    const rows = [{ id: "1", kind: "vehicle", title: "Taxi", subtitle: "LT1", href: "/v" }, { id: "2", kind: "alert", title: "Alerte", subtitle: "x", href: "/a" }] as any;
    const deps = { getUnifiedRows: vi.fn().mockResolvedValue(rows) };
    await expect(searchAll("   ", { kind: "all" }, "fleet", deps)).resolves.toEqual([]);
    await expect(searchAll("taxi", { kind: "all" }, null, deps)).resolves.toEqual([]);
    await expect(searchAll("  TaXi ", { kind: "all" }, "fleet", deps)).resolves.toEqual(rows);
    expect(deps.getUnifiedRows).toHaveBeenCalledWith("fleet", "taxi");
    await expect(searchAll("taxi", { kind: "vehicle" }, "fleet", deps)).resolves.toEqual([rows[0]]);
    expect(searchStaticIndex(" ")).toEqual([]);
    expect(searchStaticIndex("a")).toEqual([]);
    const results = searchStaticIndex("vehicule");
    expect(Array.isArray(results)).toBe(true);
    for (const result of results) {
      expect(result).toEqual(expect.objectContaining({ id: expect.any(String), kind: expect.any(String), title: expect.any(String), subtitle: expect.any(String), href: expect.any(String), weight: expect.any(Number) }));
    }
    const accented = searchStaticIndex("véhicule");
    expect(accented.map((x) => x.id)).toEqual(results.map((x) => x.id));
  });
});
