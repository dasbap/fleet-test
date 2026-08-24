import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrations = [
  "supabase/migrations/20260415150000_gps_tracking_geofence.sql",
  "supabase/migrations/20260702010000_restore_geofencing_runtime.sql",
  "supabase/migrations/20260817153000_geofence_enter_alerts.sql",
];

describe("geofence alert runtime", () => {
  it("declare les alertes geofence enter et exit dans les migrations runtime", () => {
    const sources = migrations.map((path) => readFileSync(path, "utf8")).join("\n");

    expect(sources).toContain("ADD VALUE IF NOT EXISTS 'geofence_enter'");
    expect(sources).toContain("ADD VALUE IF NOT EXISTS 'geofence_exit'");
  });

  it("cree des alertes persistantes pour les entrees et sorties selon les flags de zone", () => {
    const correctiveMigration = readFileSync(
      "supabase/migrations/20260817153000_geofence_enter_alerts.sql",
      "utf8",
    );

    expect(correctiveMigration).toContain("NEW.event_type = 'enter'");
    expect(correctiveMigration).toContain("COALESCE(g.alert_on_enter, true)");
    expect(correctiveMigration).toContain("'geofence_enter'");
    expect(correctiveMigration).toContain("NEW.event_type = 'exit'");
    expect(correctiveMigration).toContain("COALESCE(g.alert_on_exit, true)");
    expect(correctiveMigration).toContain("'geofence_exit'");
    expect(correctiveMigration).toContain("INSERT INTO public.alertes_automatiques");
  });

  it("affiche et notifie les alertes geofence enter et exit cote application", () => {
    const alertTypes = readFileSync("src/types/dto/alert.dto.ts", "utf8");
    const mobileAlerts = readFileSync("src/features/alerts/screens/MobileAlertsPage.tsx", "utf8");
    const realtime = readFileSync("src/services/realtime-fleet-subscription.service.ts", "utf8");

    expect(alertTypes).toContain('"geofence_enter"');
    expect(alertTypes).toContain('"geofence_exit"');
    expect(mobileAlerts).toContain("geofence_enter:");
    expect(mobileAlerts).toContain("geofence_exit:");
    expect(realtime).toContain('row.alert_type === "geofence_enter"');
    expect(realtime).toContain('row.alert_type === "geofence_exit"');
  });
});
