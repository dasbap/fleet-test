import { beforeEach, describe, expect, it, vi } from "vitest";

const canShareMock = vi.fn();
const shareMock = vi.fn();
const isNativePlatformMock = vi.fn();

vi.mock("@capacitor/share", () => ({ Share: { canShare: canShareMock, share: shareMock } }));
vi.mock("@/lib/platform", () => ({ isNativePlatform: isNativePlatformMock }));

import {
  buildAlertDtoDocumentSharePayload,
  buildAlertDtoSharePayload,
  buildAlertSharePayload,
  buildIncidentPhotoSharePayload,
  buildInterventionSharePayload,
  buildVehicleDocumentSharePayload,
  buildVehicleSharePayload,
  getAbsoluteUrl,
  isShareAvailable,
  shareContent,
} from "@/services/share.service";

describe("share service mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNativePlatformMock.mockReturnValue(false);
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("detects native and web share availability", async () => {
    isNativePlatformMock.mockReturnValue(true);
    canShareMock.mockResolvedValue({ value: false });
    await expect(isShareAvailable()).resolves.toBe(false);
    canShareMock.mockRejectedValue(new Error("plugin"));
    await expect(isShareAvailable()).resolves.toBe(true);
    isNativePlatformMock.mockReturnValue(false);
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn() });
    await expect(isShareAvailable()).resolves.toBe(true);
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    await expect(isShareAvailable()).resolves.toBe(false);
  });

  it("shares natively with normalized payload and files", async () => {
    isNativePlatformMock.mockReturnValue(true);
    canShareMock.mockResolvedValue({ value: true });
    shareMock.mockResolvedValue(undefined);
    await expect(shareContent({ title: "  Test  ", text: " body ", url: " https://x.test ", fileUrls: ["file://a"] })).resolves.toEqual({ outcome: "shared" });
    expect(shareMock).toHaveBeenCalledWith({ title: "Test", text: "body", url: "https://x.test", dialogTitle: "Test", files: ["file://a"] });
  });

  it("falls back to clipboard when native share is unavailable or fails", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    isNativePlatformMock.mockReturnValue(true);
    canShareMock.mockResolvedValueOnce({ value: false }).mockResolvedValueOnce({ value: true });
    await expect(shareContent({ text: "hello", url: "https://x.test" })).resolves.toEqual({ outcome: "copied" });
    expect(writeText).toHaveBeenCalledWith("hello\n\nhttps://x.test");
    shareMock.mockRejectedValue(new Error("network"));
    await expect(shareContent({ text: "hello" })).resolves.toEqual({ outcome: "copied" });
  });

  it("recognizes native cancellation variants", async () => {
    isNativePlatformMock.mockReturnValue(true);
    canShareMock.mockResolvedValue({ value: true });
    for (const error of [Object.assign(new Error("x"), { name: "AbortError" }), new Error("cancelled"), new Error("dismissed"), "user did not share"]) {
      shareMock.mockRejectedValueOnce(error);
      await expect(shareContent({ text: "hello" })).resolves.toEqual({ outcome: "cancelled" });
    }
  });

  it("uses web file share and url share paths", async () => {
    const webShare = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "share", { configurable: true, value: webShare });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: canShare });
    const file = new File(["x"], "x.txt", { type: "text/plain" });
    await expect(shareContent({ title: "A", text: " B ", files: [file] })).resolves.toEqual({ outcome: "shared" });
    expect(webShare).toHaveBeenCalledWith({ title: "A", text: "B", files: [file] });
    canShare.mockReturnValue(false);
    await expect(shareContent({ text: " C ", url: " https://x.test " })).resolves.toEqual({ outcome: "shared" });
    expect(webShare).toHaveBeenLastCalledWith({ title: "Flotte E-Samba", text: "C", url: "https://x.test" });
  });

  it("handles web cancellation and unavailable clipboard", async () => {
    const webShare = vi.fn().mockRejectedValueOnce(new Error("abort by user")).mockRejectedValueOnce(new Error("boom"));
    Object.defineProperty(navigator, "share", { configurable: true, value: webShare });
    await expect(shareContent({ text: "x" })).resolves.toEqual({ outcome: "cancelled" });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    await expect(shareContent({ text: "x" })).resolves.toEqual({ outcome: "unavailable" });
  });

  it("builds absolute urls", () => {
    expect(getAbsoluteUrl("/fleet/1")).toBe(`${window.location.origin}/fleet/1`);
    expect(getAbsoluteUrl("fleet/1")).toBe(`${window.location.origin}/fleet/1`);
  });

  it("builds vehicle payloads with fallbacks and blocked reason", () => {
    const vehicle = { id: "v1", registration: "LT 123", brand: "Toyota", model: "Yaris", current_km: 12345, blocked_reason: "Panne", status: "blocked" } as any;
    const payload = buildVehicleSharePayload(vehicle, "/vehicles/v1");
    expect(payload.title).toBe("Véhicule LT 123");
    expect(payload.text).toContain("Toyota Yaris");
    expect(payload.text).toContain("12 345 km");
    expect(payload.text).toContain("Motif de blocage : Panne");
    const fallback = buildVehicleSharePayload({ ...vehicle, brand: null, model: null, blocked_reason: null }, "vehicles/v1");
    expect(fallback.text).toContain("Véhicule");
  });

  it("builds vehicle document payload and safe file name", () => {
    const vehicle = { id: "veh-1", registration: "LT/12 34", brand: "A", model: "B", current_km: 10, status: "active", blocked_reason: null } as any;
    const payload = buildVehicleDocumentSharePayload(vehicle, [], "/vehicles/veh-1");
    expect(payload.text).toContain("Fiche véhicule (export)");
    expect(payload.text).toContain("Ouverture app :");
    expect(payload.files?.[0]?.name).toBe("fiche-vehicule-LT_12_34.txt");
  });

  it("builds persisted alert payloads and comments", () => {
    const alert = { id: "a/1", alert_type: "vehicle_blocked", severity: "critical", status: "EN_COURS", vehicle_id: null, message: "Stop", created_at: "2026-01-01T10:00:00Z" } as any;
    const payload = buildAlertDtoSharePayload(alert, "/alerts/a1");
    expect(payload.title).toBe("Alerte — Véhicule bloqué");
    expect(payload.text).toContain("Gravité : Critique");
    expect(payload.text).toContain("Statut workflow : En cours");
    expect(payload.text).toContain("Véhicule (id) : —");
    const doc = buildAlertDtoDocumentSharePayload(alert, "/alerts/a1", [{ body: "  note  ", created_at: "2026-01-02T10:00:00Z", author_user_id: " u1 " }]);
    expect(doc.text).toContain("--- Commentaires ---");
    expect(doc.text).toContain("(u1)");
    expect(doc.text).toContain("note");
    expect(doc.files?.[0]?.name).toBe("alerte-flotte-a_1.txt");
  });

  it("builds legacy alert severities and statuses", () => {
    for (const [severity, expected] of [["critical", "Critique"], ["warning", "Avertissement"], ["info", "Info"]]) {
      const payload = buildAlertSharePayload({ id: "a", type: "speeding", severity, status: "active", message: "m", createdAt: "2026-01-01T00:00:00Z" } as any, "/a");
      expect(payload.text).toContain(`Gravité : ${expected}`);
      expect(payload.text).toContain("Statut : Active");
    }
    const resolved = buildAlertSharePayload({ id: "a", type: "faq_answer", severity: "info", status: "resolved", message: "m", createdAt: "2026-01-01T00:00:00Z" } as any, "/a");
    expect(resolved.text).toContain("Statut : Résolue");
  });

  it("builds intervention and incident payloads", () => {
    const intervention = buildInterventionSharePayload({ reference: "INT-1", vehicleLabel: "Toyota", plate: "LT1", summary: "Vidange", detailPath: "/maintenance/1" });
    expect(intervention).toEqual(expect.objectContaining({ title: "Intervention INT-1", url: `${window.location.origin}/maintenance/1` }));
    expect(intervention.text).toContain("Véhicule : Toyota (LT1)");
    const noUrl = buildInterventionSharePayload({ reference: "INT-2", vehicleLabel: "A", plate: "B", summary: "C" });
    expect(noUrl.url).toBeUndefined();
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const incident = buildIncidentPhotoSharePayload({ description: "  choc  ", photoUrl: " https://x.test/photo.jpg ", photoFile: file });
    expect(incident.text).toContain("choc");
    expect(incident.text).toContain("Photo : https://x.test/photo.jpg");
    expect(incident.url).toBe("https://x.test/photo.jpg");
    expect(incident.files).toEqual([file]);
  });
});
