import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260825123051_enforce_role_vehicle_site_access.sql",
  ),
  "utf8",
);

describe("fleet site access role rules", () => {
  it("allows manager/organizer when the fleet has a paid active, inactive or pending subscription", () => {
    expect(migration).toContain("a.status IN ('active', 'inactive', 'pending_payment')");
    expect(migration).toContain("'organizer'::public.role_type");
    expect(migration).toContain("'manager'::public.role_type");
  });

  it("requires driver/mechanic to have an active vehicle assignment", () => {
    expect(migration).toContain("'driver'::public.role_type");
    expect(migration).toContain("'mechanic'::public.role_type");
    expect(migration).toContain("FROM public.affectations_vehicules av");
    expect(migration).toContain("av.driver_user_id = v_user_id");
    expect(migration).toContain("av.is_active = true");
  });

  it("requires the assigned vehicle to be covered by a currently active paid subscription", () => {
    expect(migration).toContain("JOIN public.droits_vehicules dv");
    expect(migration).toContain("dv.active = true");
    expect(migration).toContain("a.status = 'active'");
    expect(migration).toContain("a.starts_at <= now()");
    expect(migration).toContain("COALESCE(a.ends_at, 'infinity'::timestamptz) >= now()");
    expect(migration).toContain("p.code <> 'free'");
  });
});
