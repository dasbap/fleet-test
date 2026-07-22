import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("organizer plan access RPC migration", () => {
  const source = readFileSync(
    "supabase/migrations/20260722143000_inherit_organizer_plan_access.sql",
    "utf8",
  );

  it("traite le forfait Organizer comme le niveau haut de la flotte", () => {
    expect(source).toContain("CREATE OR REPLACE FUNCTION public.get_plan_access");
    expect(source).toContain("plan_code IN ('pro', 'enterprise', 'organizer')");
    expect(source).toContain("plan_code IN ('enterprise', 'organizer')");
    expect(source).toContain("GRANT EXECUTE ON FUNCTION public.get_plan_access(uuid) TO authenticated, service_role");
  });
});
