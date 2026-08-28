import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Password change route", () => {
  it("met à jour le mot de passe via l'Admin API après validation du bearer token", () => {
    const source = readFileSync(
      "src/server/http/routes/passwordChange.ts",
      "utf8",
    );

    expect(source).toContain("userClient.auth.getUser(token)");
    expect(source).toContain("admin.auth.admin.updateUserById(\n    user.id,\n    { password: parsed.data.password }");
    expect(source).not.toContain("userClient.auth.updateUser({");
  });
});
