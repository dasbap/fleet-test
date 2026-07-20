import { describe, expect, it } from "vitest";
import {
  buildEsambaDeepLinkUrl,
  buildEsambaOperationsDeepLink,
  parseDeepLink,
} from "@/lib/deepLinks/parseDeepLink";

describe("parseDeepLink", () => {
  it("parse alerte", () => {
    const r = parseDeepLink("esamba://alerts/alert-1");
    expect(r).toEqual({ ok: true, kind: "alert", alertId: "alert-1" });
  });

  it("parse liste alertes", () => {
    expect(parseDeepLink("esamba://alerts")).toEqual({ ok: true, kind: "alerts_list" });
  });

  it("parse liste flotte", () => {
    expect(parseDeepLink("esamba://fleet")).toEqual({ ok: true, kind: "fleet_list" });
  });

  it("parse liste tutoriels", () => {
    expect(parseDeepLink("esamba://tutorials")).toEqual({ ok: true, kind: "tutorials_list" });
  });

  it("parse tutoriel (tuto-03)", () => {
    const r = parseDeepLink("esamba://tutorials/tuto-03");
    expect(r).toEqual({ ok: true, kind: "tutorial", tutorialId: "tuto-03" });
  });

  it("parse véhicule (fleet)", () => {
    const r = parseDeepLink("esamba://fleet/v-99");
    expect(r).toEqual({ ok: true, kind: "vehicle", vehicleId: "v-99" });
  });

  it("parse mission (sous-chemin)", () => {
    const r = parseDeepLink("esamba://operations/mission/m-1");
    expect(r).toEqual({ ok: true, kind: "mission", missionId: "m-1" });
  });

  it("parse intervention (ticket)", () => {
    const r = parseDeepLink("esamba://operations/intervention/t-2");
    expect(r).toEqual({ ok: true, kind: "intervention", ticketId: "t-2" });
  });

  it("parse mission (segment préfixé)", () => {
    const r = parseDeepLink("esamba://operations/mission:uuid-a");
    expect(r).toEqual({ ok: true, kind: "mission", missionId: "uuid-a" });
  });

  it("refuse operations sans type", () => {
    const r = parseDeepLink("esamba://operations/only-uuid");
    expect(r.ok).toBe(false);
  });

  it("parse operations/:id avec ?kind=mission", () => {
    const r = parseDeepLink("esamba://operations/uuid-m?kind=mission");
    expect(r).toEqual({ ok: true, kind: "mission", missionId: "uuid-m" });
  });

  it("parse operations/:id avec ?type=intervention", () => {
    const r = parseDeepLink("esamba://operations/ticket-9?type=intervention");
    expect(r).toEqual({ ok: true, kind: "intervention", ticketId: "ticket-9" });
  });

  it("parse URL construite (API URL)", () => {
    const r = parseDeepLink("esamba://alerts/alert-1");
    expect(r.ok).toBe(true);
  });

  it("buildEsambaDeepLinkUrl génère des URLs routables", () => {
    expect(buildEsambaDeepLinkUrl({ screen: "alerts_list" })).toBe("esamba://alerts");
    expect(buildEsambaDeepLinkUrl({ screen: "fleet_list" })).toBe("esamba://fleet");
    expect(buildEsambaDeepLinkUrl({ screen: "tutorials_list" })).toBe("esamba://tutorials");
    expect(buildEsambaDeepLinkUrl({ screen: "tutorial", id: "tuto-03" })).toBe(
      "esamba://tutorials/tuto-03",
    );
    expect(buildEsambaDeepLinkUrl({ screen: "alert", id: "a1" })).toBe("esamba://alerts/a1");
    expect(buildEsambaDeepLinkUrl({ screen: "vehicle", id: "v1" })).toBe("esamba://fleet/v1");
    expect(buildEsambaDeepLinkUrl({ screen: "mission", id: "m1" })).toBe(
      "esamba://operations/mission/m1",
    );
    expect(buildEsambaOperationsDeepLink("x", "mission")).toBe("esamba://operations/x?kind=mission");
  });
});
