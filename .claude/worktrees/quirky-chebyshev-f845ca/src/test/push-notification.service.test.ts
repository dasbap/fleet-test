import { describe, expect, it } from "vitest";
import { mapPushDataToDeepLinkPayload } from "@/services/push-notification.service";
import { ROUTE_PATHS } from "@/navigation/routePaths";

describe("mapPushDataToDeepLinkPayload", () => {
  it("priorise esambaUrl", () => {
    expect(
      mapPushDataToDeepLinkPayload({
        esambaUrl: "esamba://alerts/abc",
        category: "incident_reported",
      }),
    ).toEqual({ esambaUrl: "esamba://alerts/abc" });
  });

  it("accepte internalPath", () => {
    expect(
      mapPushDataToDeepLinkPayload({
        internalPath: "/dashboard/settings",
      }),
    ).toEqual({ internalPath: "/dashboard/settings" });
  });

  it("refuse un chemin dangereux", () => {
    expect(
      mapPushDataToDeepLinkPayload({
        internalPath: "/dashboard/../auth",
      }),
    ).toBeNull();
  });

  it("mappe critical_alert vers alert", () => {
    expect(
      mapPushDataToDeepLinkPayload({
        category: "critical_alert",
        alert_id: "a1",
      }),
    ).toEqual({ deepLinkTarget: { screen: "alert", id: "a1" } });
  });

  it("mappe maintenance_due avec véhicule", () => {
    expect(
      mapPushDataToDeepLinkPayload({
        category: "maintenance_due",
        vehicle_id: "v1",
      }),
    ).toEqual({ deepLinkTarget: { screen: "vehicle", id: "v1" } });
  });

  it("mappe maintenance sans véhicule vers la liste entretien", () => {
    expect(
      mapPushDataToDeepLinkPayload({
        category: "maintenance_due",
      }),
    ).toEqual({ internalPath: ROUTE_PATHS.dashboardMaintenance });
  });

  it("mappe intervention_assigned", () => {
    expect(
      mapPushDataToDeepLinkPayload({
        category: "intervention_assigned",
        ticket_id: "t1",
      }),
    ).toEqual({ deepLinkTarget: { screen: "intervention", id: "t1" } });
  });

  it("mappe document_expiring sans véhicule vers réglages", () => {
    expect(
      mapPushDataToDeepLinkPayload({
        category: "document_expiring",
      }),
    ).toEqual({ internalPath: ROUTE_PATHS.dashboardSettings });
  });

  it("mappe incident_reported vers la liste incidents", () => {
    expect(
      mapPushDataToDeepLinkPayload({
        category: "incident_reported",
      }),
    ).toEqual({ internalPath: ROUTE_PATHS.dashboardIncidents });
  });
});
