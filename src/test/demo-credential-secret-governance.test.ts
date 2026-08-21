import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const setupSource = readFileSync("scripts/setup-demo-accounts.mjs", "utf8");
const resetSource = readFileSync("scripts/reset-demo-passwords.mjs", "utf8");
const verifySource = readFileSync("scripts/verify-demo-accounts.mjs", "utf8");
const smokeSource = readFileSync("scripts/smoke-demo-routes.mjs", "utf8");
const roleSmokeSource = readFileSync("scripts/smoke-roles-hub-organizer.mjs", "utf8");
const fleetCheckSource = readFileSync("scripts/check-fleet-uuid.mjs", "utf8");

describe("demo credential secret governance", () => {
  it("loads demo passwords from the environment instead of source literals", () => {
    for (const source of [setupSource, resetSource, verifySource, smokeSource, roleSmokeSource]) {
      expect(source).toContain("process.env.DEMO_PASSWORD");
      expect(source).not.toMatch(/(?:DEMO_PASSWORD|PASSWORD)\s*=\s*["'][^"']{8,}["']/);
    }
  });

  it("requires explicit opt-in before remote demo credential mutation", () => {
    for (const source of [setupSource, resetSource]) {
      expect(source).toContain("ALLOW_REMOTE_DEMO_PROVISIONING");
      expect(source).toContain("isLocalSupabaseUrl");
    }
  });

  it("never embeds privileged Supabase credentials in diagnostic scripts", () => {
    expect(fleetCheckSource).toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    expect(fleetCheckSource).toContain("process.env.SUPABASE_URL");
    expect(fleetCheckSource).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    expect(fleetCheckSource).not.toMatch(/https:\/\/[a-z0-9]+\.supabase\.co/);
  });
});
