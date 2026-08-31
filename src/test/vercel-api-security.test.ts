/** @vitest-environment node */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { applyCors, getSupabaseEnv } from "../../api/_lib/vercel-api";

describe("Vercel API CORS", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function applyOrigin(origin: string): Map<string, string> {
    const headers = new Map<string, string>();
    const req = { headers: { origin } };
    const res = {
      setHeader: (name: string, value: string) => {
        headers.set(name, value);
      },
    };

    applyCors(req as never, res as never);
    return headers;
  }

  it("ne reflete pas une origine inconnue", () => {
    process.env.NODE_ENV = "production";
    process.env.VITE_APP_URL = "https://www.e-samba.com";
    const headers = applyOrigin("https://evil.example");

    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "https://www.e-samba.com",
    );
    expect(headers.get("Vary")).toBe("Origin");
  });


  it("nettoie les retours ligne dans les variables Supabase Vercel", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co \r\n";
    process.env.SUPABASE_ANON_KEY = " anon-key \n";
    process.env.SUPABASE_SERVICE_ROLE_KEY = " service-role \r\n";
    process.env.ADMIN_SECRET = " admin-secret \n";
    process.env.APP_URL = " https://www.e-samba.com/ \r\n";
    delete process.env.VITE_APP_URL;

    expect(getSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      serviceRoleKey: "service-role",
      adminSecret: "admin-secret",
      appUrl: "https://www.e-samba.com",
    });
  });
  it("accepte localhost uniquement pour le developpement", () => {
    process.env.NODE_ENV = "development";
    const headers = applyOrigin("http://localhost:8080");

    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:8080",
    );

    process.env.NODE_ENV = "production";
    const productionHeaders = applyOrigin("http://localhost:8080");
    expect(productionHeaders.get("Access-Control-Allow-Origin")).toBe(
      "https://www.e-samba.com",
    );
  });

  it("conserve le nettoyage des marqueurs legacy sur la route Vercel", () => {
    const source = readFileSync("api/auth/clear-password-marker.ts", "utf8");

    expect(source).toContain("const userMetadata = currentUserData.user.user_metadata ?? {}");
    expect(source).toContain("userMetadata.must_set_password === true");
    expect(source).toContain("user_metadata: {");
    expect(source).toContain("must_set_password: false");
    expect(source).toContain("temporary_password_active: false");
    expect(source).toContain("MARKER_UPDATE_ATTEMPTS = 3");
  });
});
