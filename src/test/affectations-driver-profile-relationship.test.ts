import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("affectations driver profile relationship migration", () => {
  it("restores the PostgREST relationship from affectations_vehicules to profils", () => {
    const sql = readFileSync(
      "supabase/migrations/20260804114500_restore_affectations_driver_profile_relationship.sql",
      "utf8",
    ).toLowerCase();

    expect(sql).toContain("affectations_vehicules_driver_user_id_fkey");
    expect(sql).toContain("references public.profils(user_id)");
    expect(sql).toContain("not valid");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
