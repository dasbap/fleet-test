import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820130000_harden_onboarding_bootstrap.sql",
  "utf8",
);

describe("onboarding bootstrap security", () => {
  it("serializes onboarding per user before checking affiliation", () => {
    const lock = migration.indexOf("pg_advisory_xact_lock");
    const affiliationCheck = migration.indexOf("FROM public.flotte_adhesions fa");

    expect(lock).toBeGreaterThan(-1);
    expect(affiliationCheck).toBeGreaterThan(lock);
  });

  it("rejects an authenticated user who already has an active fleet membership", () => {
    expect(migration).toContain("fa.user_id = v_user_id");
    expect(migration).toContain("fa.is_active = true");
    expect(migration).toContain("onboarding_deja_affilie");
  });

  it("keeps onboarding unavailable to anonymous callers", () => {
    expect(migration).toContain("FROM PUBLIC, anon");
    expect(migration).toContain("TO authenticated");
  });
});
