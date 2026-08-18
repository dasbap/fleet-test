import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Temporary password security", () => {
  it("conserve au moins 144 bits aleatoires dans les chemins de provisioning production", () => {
    const edgeSource = readFileSync(
      "supabase/functions/create-prospect-account/index.ts",
      "utf8",
    );
    const adminSource = readFileSync("api/admin/create-user.ts", "utf8");

    expect(edgeSource).toContain("new Uint8Array(18)");
    expect(edgeSource).toContain("crypto.getRandomValues(bytes)");
    expect(edgeSource).toContain("btoa(String.fromCharCode(...bytes))");
    expect(edgeSource).not.toContain("byte % alphabet.length");

    expect(adminSource).toContain('randomBytes(18).toString("base64url")');
  });
});
