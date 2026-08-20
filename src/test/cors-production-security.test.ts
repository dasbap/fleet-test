/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import { applyCors } from "../../api/_lib/vercel-api";
import { createServerApp } from "@/server/http/app";

describe("Production CORS security", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("ne reflete jamais localhost en production sur les BFF Vercel et Hono", async () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://www.e-samba.com";
    process.env.VITE_APP_URL = "https://www.e-samba.com";

    const headers = new Map<string, string>();
    const res = {
      setHeader: (name: string, value: string) => headers.set(name, value),
    };

    applyCors(res as never, "http://localhost:5173");
    expect(headers.get("Access-Control-Allow-Origin")).toBe("https://www.e-samba.com");

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

    const app = createServerApp();
    const ambiguousOrigin = "http://localhost:5173@evil.example";

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
