import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("GPS speeding alert runtime", () => {
  it("declare le type d'alerte speeding et les seuils de vitesse par boitier GPS", () => {
    const migration = readFileSync(
      "supabase/migrations/20260817154500_gps_speeding_alerts.sql",
      "utf8",
    );

    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'speeding'");
    expect(migration).toContain("speed_limit_kmh");
    expect(migration).toContain("speed_alert_tolerance_kmh");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.vehicle_speed_states");
    expect(migration).toContain("vehicle_id uuid PRIMARY KEY");
  });

  it("detecte l'entree en exces de vitesse dans gps-ingest sans dupliquer l'alerte", () => {
    const source = readFileSync("supabase/functions/gps-ingest/index.ts", "utf8");

    expect(source).toContain("speed_limit_kmh, speed_alert_tolerance_kmh");
    expect(source).toContain("vehicle_speed_states");
    expect(source).toContain("isSpeeding");
    expect(source).toContain("previousSpeedState?.is_speeding !== true");
    expect(source).toContain('alert_type: "speeding"');
    expect(source).toContain("speedLimitKmh");
  });

  it("expose les alertes speeding cote application", () => {
    const alertTypes = readFileSync("src/types/dto/alert.dto.ts", "utf8");
    const gpsTypes = readFileSync("src/types/gps.ts", "utf8");
    const mobileAlerts = readFileSync("src/features/alerts/screens/MobileAlertsPage.tsx", "utf8");
    const realtime = readFileSync("src/services/realtime-fleet-subscription.service.ts", "utf8");

    expect(alertTypes).toContain('"speeding"');
    expect(gpsTypes).toContain("speed_limit_kmh");
    expect(gpsTypes).toContain("speed_alert_tolerance_kmh");
    expect(mobileAlerts).toContain("speeding:");
    expect(realtime).toContain('row.alert_type === "speeding"');
  });
});
