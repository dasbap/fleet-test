import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Password change route", () => {
  it("recree une session apres le changement de mot de passe avant de finaliser les marqueurs", () => {
    const source = readFileSync(
      "src/server/http/routes/passwordChange.ts",
      "utf8",
    );
    const pageSource = readFileSync(
      "src/features/auth/screens/UpdatePasswordPage.tsx",
      "utf8",
    );

    expect(source).toContain("userClient.auth.getUser(token)");
    expect(source).toContain("password: z.string().min(8).max(256).optional()");
    expect(source).toContain("if (parsed.data.password)");
    expect(pageSource).toContain("supabase.auth.getUser()");
    expect(pageSource).toContain("supabase.auth.updateUser({");
    expect(pageSource).toContain("supabase.auth.signInWithPassword({");
    expect(pageSource).not.toContain("supabase.auth.refreshSession()");
    expect(pageSource).toContain("body: JSON.stringify({})");
  });
});
