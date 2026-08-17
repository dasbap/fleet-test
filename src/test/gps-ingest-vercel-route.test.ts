/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVercelApiApp } from "@/server/http/vercel";

const validPayload = {
  protocol: "teltonika",
  imei: "356307042441013",
  latitude: 3.84812,
  longitude: 11.5174,
  speedKmh: 42.5,
  heading: 90,
  trackerTime: "2026-08-17T10:00:00.000Z",
  rawPayload: "000000000000004a8e...",
};

describe("GPS ingest Vercel route", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.GPS_INGEST_KEY = "gps-secret";
    delete process.env.GPS_INGEST_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("exige la cle d'ingestion cote Vercel", async () => {
    const app = createVercelApiApp();

    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: "Cle d'ingestion GPS invalide." });
  });

  it("relaie un payload Teltonika normalise vers l'Edge Function Supabase", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;
    const app = createVercelApiApp();

    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gps-ingest-key": "gps-secret",
      },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("https://project.supabase.co/functions/v1/gps-ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer gps-secret",
        "x-gps-ingest-key": "gps-secret",
      },
      body: JSON.stringify(validPayload),
    });
  });

  it("dispose d'une fonction Vercel dediee pour eviter le fallback SPA", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("api/gps/ingest.ts", "utf8");

    expect(source).toContain('from "@hono/node-server/vercel"');
    expect(source).toContain("createVercelApiApp");
  });
});
