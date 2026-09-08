import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/features/auth/screens/UpdatePasswordPage.tsx", "utf8");
const route = readFileSync("src/server/http/routes/passwordChange.ts", "utf8");

describe("password recovery session preservation", () => {
  it("updates the password with the authenticated browser session", () => {
    expect(page).toContain("supabase.auth.updateUser({");
    expect(page).toContain("body: JSON.stringify({})");
    expect(page.indexOf("supabase.auth.updateUser({")).toBeLessThan(
      page.indexOf('fetch("/api/auth/clear-password-marker"'),
    );
  });

  it("allows marker-only finalization without changing the password as admin", () => {
    expect(route).toContain("password: z.string().min(8).max(256).optional()");
    expect(route).toContain("if (parsed.data.password)");
    expect(route).toContain("temporary_password_issued_at");
    expect(route).toContain("userUpdatedAt <= temporaryPasswordIssuedAt");
    expect(route).toContain('error: "password_change_required"');
  });
});
