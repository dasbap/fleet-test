import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("contrat runtime du plan Starter", () => {
  it("dispose d'une migration dediee qui active les modules annonces", () => {
    const migrationPath = join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260721100000_make_starter_public_features_operational.sql",
    );

    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("code = 'starter'");
    expect(sql).toContain("price_per_vehicle = 15000");
    expect(sql).toContain("max_vehicles = 25");
    expect(sql).toContain("enables_finance = true");
    expect(sql).toContain("enables_reports = true");
    expect(sql).toContain("enables_driver_scoring = true");
    expect(sql).toContain("enables_anomaly_insights = false");
    expect(sql).toContain("enables_geofencing = false");
    expect(sql).toContain("enables_scheduled_reports = false");
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });
});
