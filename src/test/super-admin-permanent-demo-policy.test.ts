import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260722162000_super_admin_permanent_demo_access.sql"
);

describe("super admin permanent demo access policy", () => {
  it("cree les comptes permanents uniquement via un parametre explicite et les masque aux admins simples", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("p_permanent_access boolean default false");

    expect(sql).toContain("case when p_permanent_access then null");

    expect(sql).toContain(
      "public.is_platform_super_admin() or dp.expires_at is not null"
    );

    expect(sql).toContain(
      "grant execute on function public.prospect_create_account(uuid, text, text, uuid, uuid, int, text, boolean) to service_role"
    );
  });

  it("verrouille aussi l'edge function si elle est appelee directement", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "supabase/functions/create-prospect-account/index.ts"
      ),
      "utf8"
    );

    expect(source).toContain("const invitedBy = body.invited_by ?? null");

    expect(source).toContain(
      "const permanentAccess = body.permanent_access === true"
    );

    expect(source).toContain("permanentAccess && !invitedBy");

    expect(source).toContain("permanentAccess && invitedBy");

    expect(source).toContain('.from("admin_profiles")');

    expect(source).toContain('.eq("user_id", invitedBy)');

    expect(source).toContain('.eq("internal_role", "super_admin")');

    expect(source).toContain('.eq("is_active", true)');

    expect(source).toContain("forbidden_super_admin_required");
  });
});
