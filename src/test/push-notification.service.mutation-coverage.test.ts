import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkPermissions, requestPermissions, register, addListener, createChannel, getPlatform, isNativePlatform, dispatchFromPushPayload, disableDeviceToken } = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  register: vi.fn(),
  addListener: vi.fn(),
  createChannel: vi.fn(),
  getPlatform: vi.fn(),
  isNativePlatform: vi.fn(),
  dispatchFromPushPayload: vi.fn(),
  disableDeviceToken: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform } }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: { checkPermissions, requestPermissions, register, addListener, createChannel } }));
vi.mock("@/lib/platform", () => ({ isNativePlatform }));
vi.mock("@/services/deep-link.service", () => ({ deepLinkService: { dispatchFromPushPayload } }));
vi.mock("@/repositories/notification.repository", () => ({ NotificationRepository: class {} }));
vi.mock("@/services/notification.service", () => ({ NotificationService: class { disableDeviceToken = disableDeviceToken; } }));

import {
  PushNotificationService,
  clearPushTokenOnLogout,
  mapPushDataToDeepLinkPayload,
  normalizePushData,
  pushNotificationService,
} from "@/services/push-notification.service";

describe("push notification mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("ios");
    checkPermissions.mockResolvedValue({ receive: "granted" });
    requestPermissions.mockResolvedValue({ receive: "granted" });
    register.mockResolvedValue(undefined);
    createChannel.mockResolvedValue(undefined);
    addListener.mockImplementation(async () => ({ remove: vi.fn().mockResolvedValue(undefined) }));
  });

  it("normalizes only supported scalar push values", () => {
    expect(normalizePushData(null)).toEqual({});
    expect(normalizePushData([])).toEqual({});
    expect(normalizePushData("x")).toEqual({});
    expect(normalizePushData({ a: " x ", b: 2, c: true, d: false, e: null, f: undefined, g: {}, h: [1] })).toEqual({ a: " x ", b: "2", c: "true", d: "false" });
  });

  it("maps direct urls and internal paths with priority", () => {
    expect(mapPushDataToDeepLinkPayload({ esambaUrl: " esamba://vehicle/1 " })).toEqual({ esambaUrl: "esamba://vehicle/1" });
    expect(mapPushDataToDeepLinkPayload({ esamba_url: "x", internalPath: "/ignored" })).toEqual({ esambaUrl: "x" });
    expect(mapPushDataToDeepLinkPayload({ deep_link: "y" })).toEqual({ esambaUrl: "y" });
    expect(mapPushDataToDeepLinkPayload({ url: "z" })).toEqual({ esambaUrl: "z" });
    expect(mapPushDataToDeepLinkPayload({ internalPath: " /dashboard/fleet " })).toEqual({ internalPath: "/dashboard/fleet" });
    expect(mapPushDataToDeepLinkPayload({ path: "http://evil" })).toBeNull();
    expect(mapPushDataToDeepLinkPayload({ route: "/a/../b" })).toBeNull();
  });

  it("maps all business categories and identifier aliases", () => {
    expect(mapPushDataToDeepLinkPayload({ category: "critical_alert", alertId: "a1" })).toEqual({ deepLinkTarget: { screen: "alert", id: "a1" } });
    expect(mapPushDataToDeepLinkPayload({ type: "ALERT", alert_id: "a2" })).toEqual({ deepLinkTarget: { screen: "alert", id: "a2" } });
    expect(mapPushDataToDeepLinkPayload({ category: "maintenance_due", vehicleId: "v1" })).toEqual({ deepLinkTarget: { screen: "vehicle", id: "v1" } });
    expect(mapPushDataToDeepLinkPayload({ category: "maintenance" })).toEqual({ internalPath: expect.stringContaining("maintenance") });
    expect(mapPushDataToDeepLinkPayload({ category: "intervention_assigned", intervention_id: "t1" })).toEqual({ deepLinkTarget: { screen: "intervention", id: "t1" } });
    expect(mapPushDataToDeepLinkPayload({ category: "document_expiring", vehicle_id: "v2" })).toEqual({ deepLinkTarget: { screen: "vehicle", id: "v2" } });
    expect(mapPushDataToDeepLinkPayload({ category: "document" })).toEqual({ internalPath: expect.stringContaining("settings") });
    expect(mapPushDataToDeepLinkPayload({ category: "incident_reported" })).toEqual({ internalPath: expect.stringContaining("incidents") });
    expect(mapPushDataToDeepLinkPayload({ esamba_category: "mission_assigned", mission_id: "m1" })).toEqual({ deepLinkTarget: { screen: "mission", id: "m1" } });
    expect(mapPushDataToDeepLinkPayload({ category: "mission" })).toEqual({ internalPath: expect.stringContaining("operations") });
    expect(mapPushDataToDeepLinkPayload({ category: "unknown" })).toBeNull();
    expect(mapPushDataToDeepLinkPayload({ category: "critical_alert" })).toBeNull();
    expect(mapPushDataToDeepLinkPayload({ category: "intervention" })).toBeNull();
  });

  it("delegates permission checks", async () => {
    const service = new PushNotificationService();
    await expect(service.checkPermissions()).resolves.toEqual({ receive: "granted" });
    await expect(service.requestPermissions()).resolves.toEqual({ receive: "granted" });
    expect(checkPermissions).toHaveBeenCalledTimes(1);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
  });

  it("registers only when native push is configured", async () => {
    const service = new PushNotificationService();
    vi.stubEnv("VITE_NATIVE_PUSH_CONFIGURED", "false");
    await service.register();
    expect(register).not.toHaveBeenCalled();
    vi.stubEnv("VITE_NATIVE_PUSH_CONFIGURED", "true");
    await service.register();
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("dispatches mapped navigation and callback", () => {
    const service = new PushNotificationService();
    const onNavigate = vi.fn();
    expect(service.dispatchNavigationFromData({ category: "incident", extra: 1 }, { onNavigate })).toBe(true);
    expect(dispatchFromPushPayload).toHaveBeenCalledWith({ internalPath: expect.stringContaining("incidents") });
    expect(onNavigate).toHaveBeenCalledWith({ internalPath: expect.stringContaining("incidents") });
    expect(service.dispatchNavigationFromData({ category: "unknown" }, { onNavigate })).toBe(false);
  });

  it("start is a no-op on web and when native config is disabled", async () => {
    const service = new PushNotificationService();
    isNativePlatform.mockReturnValue(false);
    vi.stubEnv("VITE_NATIVE_PUSH_CONFIGURED", "true");
    let stop = await service.start();
    await expect(stop()).resolves.toBeUndefined();
    expect(requestPermissions).not.toHaveBeenCalled();
    isNativePlatform.mockReturnValue(true);
    vi.stubEnv("VITE_NATIVE_PUSH_CONFIGURED", "false");
    stop = await service.start();
    await stop();
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it("stops when permission is denied", async () => {
    const service = new PushNotificationService();
    vi.stubEnv("VITE_NATIVE_PUSH_CONFIGURED", "true");
    requestPermissions.mockResolvedValue({ receive: "denied" });
    const stop = await service.start();
    expect(addListener).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
    await stop();
  });

  it("starts listeners routes taps stores token and invokes callbacks", async () => {
    vi.stubEnv("VITE_NATIVE_PUSH_CONFIGURED", "true");
    getPlatform.mockReturnValue("android");
    const callbacks: Record<string, Function> = {};
    const removes = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    let index = 0;
    addListener.mockImplementation(async (name: string, callback: Function) => {
      callbacks[name] = callback;
      return { remove: removes[index++] };
    });
    const service = new PushNotificationService();
    const onRegistration = vi.fn();
    const onRegistrationError = vi.fn();
    const onReceived = vi.fn();
    const onNavigate = vi.fn();
    const stop = await service.start({ onRegistration, onRegistrationError, onPushNotificationReceived: onReceived, onNavigateFromNotification: onNavigate });
    expect(createChannel).toHaveBeenCalledWith({ id: "esamba_default", name: "Flotte E-Samba", description: "Alertes et rappels flotte", importance: 4, visibility: 1, sound: undefined });
    expect(addListener).toHaveBeenCalledTimes(4);
    expect(register).toHaveBeenCalledTimes(1);
    callbacks.registration({ value: "token-123" });
    expect(service.getLastToken()).toBe("token-123");
    expect(onRegistration).toHaveBeenCalledWith({ value: "token-123" });
    callbacks.registrationError({ error: "registration failed" });
    expect(onRegistrationError).toHaveBeenCalledWith({ error: "registration failed" });
    const notification = { id: "n1", title: "T", data: { category: "incident" } };
    callbacks.pushNotificationReceived(notification);
    expect(onReceived).toHaveBeenCalledWith(notification);
    callbacks.pushNotificationActionPerformed({ actionId: "tap", notification: { data: { category: "critical_alert", alert_id: "a1" }, link: "" } });
    expect(dispatchFromPushPayload).toHaveBeenCalledWith({ deepLinkTarget: { screen: "alert", id: "a1" } });
    expect(onNavigate).toHaveBeenCalledWith({ deepLinkTarget: { screen: "alert", id: "a1" } });
    callbacks.pushNotificationActionPerformed({ actionId: "tap", notification: { data: {}, link: "esamba://vehicle/9" } });
    expect(onNavigate).toHaveBeenCalledWith({ esambaUrl: "esamba://vehicle/9" });
    callbacks.pushNotificationActionPerformed({ actionId: "tap", notification: { data: { category: "unknown" } } });
    await stop();
    expect(removes.every((remove) => remove.mock.calls.length === 1)).toBe(true);
  });

  it("ignores a second start and tolerates channel and listener removal failures", async () => {
    vi.stubEnv("VITE_NATIVE_PUSH_CONFIGURED", "true");
    getPlatform.mockReturnValue("android");
    createChannel.mockRejectedValue(new Error("channel fail"));
    const remove = vi.fn().mockRejectedValue(new Error("remove fail"));
    addListener.mockResolvedValue({ remove });
    const service = new PushNotificationService();
    const firstStop = await service.start();
    const calls = addListener.mock.calls.length;
    const secondStop = await service.start();
    expect(addListener).toHaveBeenCalledTimes(calls);
    await secondStop();
    await expect(firstStop()).resolves.toBeUndefined();
  });

  it("clears logout token after singleton registration and ignores disable errors", async () => {
    vi.stubEnv("VITE_NATIVE_PUSH_CONFIGURED", "true");
    const callbacks: Record<string, Function> = {};
    addListener.mockImplementation(async (name: string, callback: Function) => { callbacks[name] = callback; return { remove: vi.fn() }; });
    const stop = await pushNotificationService.start();
    callbacks.registration({ value: "logout-token" });
    await clearPushTokenOnLogout();
    expect(disableDeviceToken).toHaveBeenCalledWith("logout-token");
    disableDeviceToken.mockRejectedValueOnce(new Error("db"));
    await expect(clearPushTokenOnLogout()).resolves.toBeUndefined();
    await stop();
  });
});
