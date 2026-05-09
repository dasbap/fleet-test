import { describe, expect, it } from "vitest";
import {
  getAlertWhatsappTemplate,
  getDashboardWhatsappTemplate,
} from "@/constants/whatsapp-template-mapping";

describe("whatsapp-template-mapping", () => {
  it("retourne le template maintenance attendu", () => {
    expect(getAlertWhatsappTemplate("maintenance_due", "assigned")).toBe(
      "maintenance_alert_assigned_fr",
    );
  });

  it("retourne null pour un type non couvert", () => {
    expect(getAlertWhatsappTemplate("vehicle_blocked", "assigned")).toBeNull();
  });

  it("retourne le template dashboard attendu", () => {
    expect(getDashboardWhatsappTemplate("schedule")).toBe(
      "maintenance_alert_action_required_fr",
    );
  });
});
