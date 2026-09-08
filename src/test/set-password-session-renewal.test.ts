import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("SetPasswordPage session renewal", () => {
  it("creates a fresh password session instead of refreshing the revoked token", () => {
    const source = readFileSync(
      "src/features/auth/screens/SetPasswordPage.tsx",
      "utf8",
    );

    expect(source).toContain("supabase.auth.signInWithPassword({");
    expect(source).toContain("email: user.email");
    expect(source).toContain("password");
    expect(source).not.toContain("supabase.auth.refreshSession()");
  });
});
