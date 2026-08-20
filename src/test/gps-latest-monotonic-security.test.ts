import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260820103000_atomic_gps_latest.sql", "utf8");
const ingest = readFileSync("supabase/functions/gps-ingest/index.ts", "utf8");

describe("GPS latest position monotonicity", () => {
  it("only overwrites latest with a strictly newer tracker timestamp", () => {
    expect(migration).toContain("EXCLUDED.tracker_time > public.vehicle_positions_latest.tracker_time");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
  });

  it("does not update speed or geofence state for a stale packet", () => {
    const rpcIndex = ingest.indexOf('"gps_upsert_latest_position"');
    const staleIndex = ingest.indexOf("latestAccepted !== true");
    const speedIndex = ingest.indexOf("if (payload.speedKmh != null)");
    const geofenceIndex = ingest.indexOf('.from("geofences")');

    expect(rpcIndex).toBeGreaterThan(-1);
    expect(staleIndex).toBeGreaterThan(rpcIndex);
    expect(speedIndex).toBeGreaterThan(staleIndex);
    expect(geofenceIndex).toBeGreaterThan(staleIndex);
    expect(ingest).toContain('reason: "stale_tracker_time"');
  });
});
