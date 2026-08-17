import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("GPS tracker protocols", () => {
  it("supporte Teltonika comme protocole normalise de bout en bout", () => {
    const typeSource = readFileSync("src/types/gps.ts", "utf8");
    const edgeSource = readFileSync("supabase/functions/gps-ingest/index.ts", "utf8");
    const migrations = [
      readFileSync("supabase/migrations/20260415150000_gps_tracking_geofence.sql", "utf8"),
      readFileSync("supabase/migrations/20260804123000_restore_gps_tracking_runtime.sql", "utf8"),
    ].join("\n");

    expect(typeSource).toContain('"teltonika"');
    expect(edgeSource).toContain('"teltonika"');
    expect(migrations).toContain("'teltonika'");
  });
});
