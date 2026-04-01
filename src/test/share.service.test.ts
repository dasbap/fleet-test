import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  shareContent,
  getAbsoluteUrl,
  buildInterventionSharePayload,
  buildAlertDtoSharePayload,
} from "@/services/share.service";

vi.mock("@capacitor/share", () => ({
  Share: {
    canShare: vi.fn().mockResolvedValue({ value: true }),
    share: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/lib/platform", () => ({
  isNativePlatform: (): boolean => false,
}));

describe("share.service (web / fallback)", () => {
  const originalShare = navigator.share;
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.stubGlobal("navigator", {
      ...navigator,
      share: undefined,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    navigator.share = originalShare;
    Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
  });

  it("copie dans le presse-papiers si le partage web n’existe pas", async () => {
    const { outcome } = await shareContent({
      title: "Test",
      text: "Bonjour",
      url: "https://example.com/x",
    });
    expect(outcome).toBe("copied");
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("getAbsoluteUrl préfixe l’origine", () => {
    expect(getAbsoluteUrl("/dashboard")).toMatch(/\/dashboard$/);
  });

  it("buildInterventionSharePayload inclut référence et véhicule", () => {
    const p = buildInterventionSharePayload({
      reference: "INT-001",
      vehicleLabel: "Iveco Daily",
      plate: "AB-123-CD",
      summary: "Vidange effectuée.",
      detailPath: "/dashboard/maintenance",
    });
    expect(p.text).toContain("INT-001");
    expect(p.text).toContain("Iveco Daily");
    expect(p.url).toContain("/dashboard/maintenance");
  });

  it("buildAlertDtoSharePayload inclut lien web et esamba://", () => {
    const p = buildAlertDtoSharePayload(
      {
        id: "a1",
        fleet_id: "f1",
        alert_type: "vehicle_blocked",
        driver_user_id: null,
        vehicle_id: "v1",
        shift_id: null,
        severity: "high",
        message: "Test message",
        resolved: false,
        resolved_by: null,
        resolved_at: null,
        created_at: "2025-01-01T12:00:00.000Z",
        status: "NOUVEAU",
        assignee_user_id: null,
        assigned_at: null,
        status_updated_at: null,
      },
      "/dashboard/alerts/a1",
    );
    expect(p.text).toContain("esamba://alerts/a1");
    expect(p.text).toContain("Ouverture app");
  });
});

describe("share.service (Web Share API)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("utilise navigator.share lorsqu’il est disponible", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share,
      clipboard: { writeText: vi.fn() },
    });

    const { outcome } = await shareContent({ text: "Hello", url: "https://a.test" });
    expect(outcome).toBe("shared");
    expect(share).toHaveBeenCalled();
  });
});
