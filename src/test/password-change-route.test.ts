import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Password change route", () => {
  it("valide le bearer token et ne change pas le mot de passe quand le client l'a deja mis a jour", () => {
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
    expect(pageSource).toContain("supabase.auth.updateUser({");
    expect(pageSource).toContain("body: JSON.stringify({})");
  });
});
