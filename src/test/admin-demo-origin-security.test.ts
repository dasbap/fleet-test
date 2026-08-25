import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { resolveAppUrlFromOrigin } from "@/server/http/routes/adminDemo";

const demoMagicLinkFunction = readFileSync(
  "supabase/functions/demo-magic-link/index.ts",
  "utf8",
);

describe("admin demo origin security", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAppUrl = process.env.APP_URL;
  const originalViteAppUrl = process.env.VITE_APP_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.APP_URL = originalAppUrl;
    process.env.VITE_APP_URL = originalViteAppUrl;
  });

  it("accepts a structurally valid local development origin", () => {
    process.env.NODE_ENV = "development";
    expect(resolveAppUrlFromOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    expect(resolveAppUrlFromOrigin("http://127.0.0.1:5173")).toBe("http://127.0.0.1:5173");
  });

  it("rejects an ambiguous localhost-looking origin", () => {
    process.env.NODE_ENV = "development";
    const result = resolveAppUrlFromOrigin("http://localhost:5173@evil.example");
    expect(result).not.toContain("evil.example");
  });

  it("never uses localhost as a production redirect origin", () => {
    process.env.NODE_ENV = "production";
    const result = resolveAppUrlFromOrigin("http://localhost:5173");
    expect(result).not.toBe("http://localhost:5173");
  });

  it("does not log full demo magic-link bearer tokens", () => {
    expect(demoMagicLinkFunction).not.toContain("Created for ${email} → ${link.token}");
    expect(demoMagicLinkFunction).toContain("Created for ${email} -> ${link.token.slice(0, 8)}");
  });

  it("does not persist full demo magic-link tokens in rate-limit keys", () => {
    expect(demoMagicLinkFunction).not.toContain("`validate_token:${token}`");
    expect(demoMagicLinkFunction).toContain("hashSensitiveValue(token)");
  });
});
