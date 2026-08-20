/** @vitest-environment node */
import { createHash, createHmac } from "node:crypto";
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

function signedHeaders(body: string, nonce = "0123456789abcdef0123456789abcdef") {
  const gatewayId = "gateway-test";
  const secret = "g".repeat(32);
  const timestamp = Date.now().toString();
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", secret)
    .update(`${gatewayId}.${timestamp}.${nonce}.${payloadHash}`)
    .digest("hex");
  return {
    "Content-Type": "application/json",
    "x-gps-gateway-id": gatewayId,
    "x-gps-timestamp": timestamp,
    "x-gps-nonce": nonce,
    "x-gps-signature": signature,
  };
}

function installSuccessfulFetchMock() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/rest/v1/rpc/gps_claim_gateway_nonce")) {
      return new Response("true", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;
  return fetchMock;
}

describe("GPS ingest Vercel route", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    process.env.GPS_INGEST_KEY = "gps-secret";
    process.env.GPS_GATEWAY_SECRETS = JSON.stringify({ "gateway-test": "g".repeat(32) });
    process.env.GPS_GATEWAY_DEVICE_BINDINGS = JSON.stringify({
      "gateway-test": [validPayload.imei],
    });
    delete process.env.GPS_INGEST_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("exige une signature gateway valide cote Vercel", async () => {
    const app = createVercelApiApp();
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentification gateway GPS invalide." });
  });

  it("rejette une signature alteree", async () => {
    const app = createVercelApiApp();
    const body = JSON.stringify(validPayload);
    const headers = signedHeaders(body, "1123456789abcdef0123456789abcdef");
    headers["x-gps-signature"] = "0".repeat(64);
    const response = await app.request("/api/gps/ingest", { method: "POST", headers, body });
    expect(response.status).toBe(401);
  });

  it("refuse un gateway signe sans binding IMEI explicite", async () => {
    delete process.env.GPS_GATEWAY_DEVICE_BINDINGS;
    const app = createVercelApiApp();
    const body = JSON.stringify(validPayload);
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: signedHeaders(body, "1823456789abcdef0123456789abcdef"),
      body,
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "IMEI non autorise pour ce gateway GPS." });
  });

  it("refuse un IMEI absent du binding du gateway", async () => {
    process.env.GPS_GATEWAY_DEVICE_BINDINGS = JSON.stringify({
      "gateway-test": ["356307042441014"],
    });
    const app = createVercelApiApp();
    const body = JSON.stringify(validPayload);
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: signedHeaders(body, "1923456789abcdef0123456789abcdef"),
      body,
    });
    expect(response.status).toBe(403);
  });

  it("rejette le rejeu d'un meme nonce via le stockage persistant", async () => {
    let nonceClaims = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rest/v1/rpc/gps_claim_gateway_nonce")) {
        nonceClaims += 1;
        return new Response(nonceClaims === 1 ? "true" : "false", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const app = createVercelApiApp();
    const body = JSON.stringify(validPayload);
    const headers = signedHeaders(body, "2123456789abcdef0123456789abcdef");
    const first = await app.request("/api/gps/ingest", { method: "POST", headers, body });
    const second = await app.request("/api/gps/ingest", { method: "POST", headers, body });
    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: "Rejeu gateway GPS detecte." });
  });

  it("rejette un payload trop volumineux avant authentification", async () => {
    const app = createVercelApiApp();
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(16 * 1024 + 1),
      },
      body: "{}",
    });
    expect(response.status).toBe(413);
  });

  it("relaie un payload signe vers l'Edge Function Supabase", async () => {
    const fetchMock = installSuccessfulFetchMock();
    const app = createVercelApiApp();
    const body = JSON.stringify(validPayload);
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: signedHeaders(body, "3123456789abcdef0123456789abcdef"),
      body,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/rpc/gps_claim_gateway_nonce",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith("https://project.supabase.co/functions/v1/gps-ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer gps-secret",
        "x-gps-ingest-key": "gps-secret",
      },
      body,
    });
  });

  it("dispose d'une fonction Vercel dediee pour eviter le fallback SPA", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("api/gps/ingest.ts", "utf8");
    expect(source).toContain('from "@hono/node-server/vercel"');
    expect(source).toContain("createVercelApiApp");
  });
});
