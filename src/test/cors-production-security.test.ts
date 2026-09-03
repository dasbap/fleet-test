/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import { applyCors } from "../../api/_lib/vercel-api";
import { resolveAppUrlFromOrigin } from "@/server/http/routes/adminDemo";
import { createServerApp } from "@/server/http/app";

describe("Production CORS security", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function corsOrigin(origin: string): string | undefined {
    const headers = new Map<string, string>();
    const req = { headers: { origin } };
    const res = {
      setHeader: (name: string, value: string) => headers.set(name, value),
    };

    applyCors(req as never, res as never);
    return headers.get("Access-Control-Allow-Origin");
  }

  it("utilise l'origine réelle de la requête pour les BFF Vercel", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://www.e-samba.com";
    process.env.VITE_APP_URL = "https://www.e-samba.com";

    expect(corsOrigin("https://www.e-samba.com")).toBe("https://www.e-samba.com");
    expect(corsOrigin("https://app.e-samba.com")).toBe("https://app.e-samba.com");
    expect(corsOrigin("https://evil.example")).toBe("https://www.e-samba.com");
  });

  it("autorise les origins de production et le domaine Vercel de test sur Hono", async () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://www.e-samba.com";

    const app = createServerApp();
    for (const origin of [
      "https://www.e-samba.com",
      "https://app.e-samba.com",
      "https://fleet-test-gamma.vercel.app",
    ]) {
      const response = await app.request("/health", { headers: { Origin: origin } });
      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    }
  });

  it("autorise fleet-test-gamma sur les routes admin en production", async () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://www.e-samba.com";

    const app = createServerApp();
    const response = await app.request("/api/admin/generate-magic-link", {
      method: "POST",
      headers: {
        Origin: "https://fleet-test-gamma.vercel.app",
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    expect(response.status).not.toBe(403);
    expect(await response.json()).not.toEqual({
      ok: false,
      error: "origin_not_allowed",
    });
  });

  it("ne reflete jamais localhost en production sur les BFF Vercel et Hono", async () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://www.e-samba.com";
    process.env.VITE_APP_URL = "https://www.e-samba.com";

    expect(corsOrigin("http://localhost:5173")).toBe("https://www.e-samba.com");

    const app = createServerApp();
    const response = await app.request("/health", {
      headers: { Origin: "http://localhost:5173" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("rejette les origins localhost ambigus sur les routes admin et demo", async () => {
    process.env.NODE_ENV = "development";
    process.env.APP_URL = "https://www.e-samba.com";
    process.env.VITE_APP_URL = "https://www.e-samba.com";

    const ambiguousOrigin = "http://localhost:5173@evil.example";
    const resolved = resolveAppUrlFromOrigin(ambiguousOrigin);
    expect(resolved).toBe("https://www.e-samba.com");

    const localResolved = resolveAppUrlFromOrigin("http://localhost:5173");
    expect(localResolved).toBe("http://localhost:5173");

    const app = createServerApp();
    const adminResponse = await app.request("/api/admin/create-prospect", {
      method: "POST",
      headers: {
        Origin: ambiguousOrigin,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(adminResponse.status).toBe(403);
    expect(await adminResponse.json()).toEqual({
      ok: false,
      error: "origin_not_allowed",
    });

    const demoResponse = await app.request("/api/demo/magic-link", {
      method: "POST",
      headers: {
        Origin: ambiguousOrigin,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(demoResponse.status).toBe(403);
    expect(await demoResponse.json()).toEqual({
      ok: false,
      error: "origin_not_allowed",
    });
  });
});
