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

function signedHeadersAt(
  body: string,
  timestamp: number,
  nonce = "0123456789abcdef0123456789abcdef",
  gatewayId = "gateway-test",
  secret = "g".repeat(32),
) {
  const timestampRaw = String(timestamp);
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", secret)
    .update(`${gatewayId}.${timestampRaw}.${nonce}.${payloadHash}`)
    .digest("hex");
  return {
    "Content-Type": "application/json",
    "x-gps-gateway-id": gatewayId,
    "x-gps-timestamp": timestampRaw,
    "x-gps-nonce": nonce,
    "x-gps-signature": signature,
  };
}

function signedHeaders(body: string, nonce = "0123456789abcdef0123456789abcdef") {
  return signedHeadersAt(body, Date.now(), nonce);
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

async function postSignedPayload(
  payload: unknown,
  nonce = "4123456789abcdef0123456789abcdef",
) {
  const body = JSON.stringify(payload);
  const app = createVercelApiApp();
  return app.request("/api/gps/ingest", {
    method: "POST",
    headers: signedHeaders(body, nonce),
    body,
  });
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

  it.each([
    ["nonce trop court", "0123456789abcdef", 0],
    ["nonce avec caractere non hexadecimal", "z123456789abcdef0123456789abcdef", 0],
    ["timestamp trop ancien", "0123456789abcdef0123456789abcdea", -120_001],
    ["timestamp trop futur", "0123456789abcdef0123456789abcdeb", 30_001],
  ])("rejette %s", async (_label, nonce, timestampOffsetMs) => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const body = JSON.stringify(validPayload);
    const app = createVercelApiApp();
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: signedHeadersAt(body, now + timestampOffsetMs, nonce),
      body,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentification gateway GPS invalide." });
  });

  it("rejette un timestamp non entier", async () => {
    const body = JSON.stringify(validPayload);
    const gatewayId = "gateway-test";
    const timestampRaw = "1.5";
    const nonce = "0123456789abcdef0123456789abcdec";
    const payloadHash = createHash("sha256").update(body).digest("hex");
    const signature = createHmac("sha256", "g".repeat(32))
      .update(`${gatewayId}.${timestampRaw}.${nonce}.${payloadHash}`)
      .digest("hex");
    const app = createVercelApiApp();
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gps-gateway-id": gatewayId,
        "x-gps-timestamp": timestampRaw,
        "x-gps-nonce": nonce,
        "x-gps-signature": signature,
      },
      body,
    });
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

  it.each([
    ["bindings JSON invalides", "{"],
    ["bindings tableau au lieu objet", "[]"],
    ["binding IMEI invalide", JSON.stringify({ "gateway-test": ["abc"] })],
  ])("refuse un gateway quand %s", async (_label, bindings) => {
    process.env.GPS_GATEWAY_DEVICE_BINDINGS = bindings;
    const response = await postSignedPayload(validPayload, "2023456789abcdef0123456789abcdef");
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

  it.each(["-1", "1.5", "NaN"])("rejette Content-Length invalide %s", async (contentLength) => {
    const app = createVercelApiApp();
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": contentLength,
      },
      body: "{}",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Content-Length invalide" });
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
    expect(await response.json()).toEqual({ error: "Payload GPS trop volumineux" });
  });

  it("accepte exactement 16 KiB pour le controle Content-Length", async () => {
    const app = createVercelApiApp();
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(16 * 1024),
      },
      body: "{}",
    });
    expect(response.status).toBe(401);
  });

  it("rejette un corps reel superieur a 16 KiB sans se fier au header", async () => {
    const app = createVercelApiApp();
    const body = "x".repeat(16 * 1024 + 1);
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    expect(response.status).toBe(413);
  });

  it("rejette un JSON invalide apres authentification", async () => {
    const body = "{";
    const app = createVercelApiApp();
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: signedHeaders(body, "2223456789abcdef0123456789abcdef"),
      body,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Corps JSON invalide" });
  });

  it.each([
    ["protocole", { ...validPayload, protocol: "gps" }],
    ["imei lettres", { ...validPayload, imei: "35630704244101x" }],
    ["imei trop court", { ...validPayload, imei: "3563070424410" }],
    ["latitude basse", { ...validPayload, latitude: -90.01 }],
    ["latitude haute", { ...validPayload, latitude: 90.01 }],
    ["longitude basse", { ...validPayload, longitude: -180.01 }],
    ["longitude haute", { ...validPayload, longitude: 180.01 }],
    ["vitesse negative", { ...validPayload, speedKmh: -0.01 }],
    ["vitesse trop haute", { ...validPayload, speedKmh: 300.01 }],
    ["cap negatif", { ...validPayload, heading: -0.01 }],
    ["cap trop haut", { ...validPayload, heading: 360.01 }],
    ["altitude trop basse", { ...validPayload, altitudeM: -1000.01 }],
    ["altitude trop haute", { ...validPayload, altitudeM: 20_000.01 }],
    ["date sans offset", { ...validPayload, trackerTime: "2026-08-17T10:00:00" }],
    ["raw payload trop long", { ...validPayload, rawPayload: "x".repeat(4001) }],
  ])("rejette un payload invalide: %s", async (_label, payload) => {
    const response = await postSignedPayload(payload, "2323456789abcdef0123456789abcdef");
    expect(response.status).toBe(400);
    const json = (await response.json()) as { error?: string };
    expect(json.error).toBe("Donnees GPS invalides");
  });

  it.each([
    ["latitude min", { ...validPayload, latitude: -90 }],
    ["latitude max", { ...validPayload, latitude: 90 }],
    ["longitude min", { ...validPayload, longitude: -180 }],
    ["longitude max", { ...validPayload, longitude: 180 }],
    ["vitesse min", { ...validPayload, speedKmh: 0 }],
    ["vitesse max", { ...validPayload, speedKmh: 300 }],
    ["cap min", { ...validPayload, heading: 0 }],
    ["cap max", { ...validPayload, heading: 360 }],
    ["altitude min", { ...validPayload, altitudeM: -1000 }],
    ["altitude max", { ...validPayload, altitudeM: 20_000 }],
    ["raw payload max", { ...validPayload, rawPayload: "x".repeat(4000) }],
  ])("accepte la borne valide: %s", async (_label, payload) => {
    installSuccessfulFetchMock();
    const response = await postSignedPayload(payload, `3${Math.random().toString(16).slice(2, 32).padEnd(31, "0")}`.slice(0, 32));
    expect(response.status).toBe(200);
  });

  it("retourne 503 si la protection anti-rejeu n'a pas de service role key", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const response = await postSignedPayload(validPayload, "2423456789abcdef0123456789abcdef");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Protection anti-rejeu indisponible." });
  });

  it("retourne 503 si le RPC anti-rejeu echoue", async () => {
    globalThis.fetch = vi.fn(async () => new Response("boom", { status: 500 })) as typeof fetch;
    const response = await postSignedPayload(validPayload, "2523456789abcdef0123456789abcdef");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Protection anti-rejeu indisponible." });
  });

  it("retourne 500 si la cle d'ingestion est absente apres claim du nonce", async () => {
    delete process.env.GPS_INGEST_KEY;
    installSuccessfulFetchMock();
    const response = await postSignedPayload(validPayload, "2623456789abcdef0123456789abcdef");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Configuration ingestion GPS manquante." });
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
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: "service-role-test",
          Authorization: "Bearer service-role-test",
        },
        body: expect.stringContaining('"p_gateway_id":"gateway-test"'),
      },
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

  it("normalise le nonce en minuscules dans le claim anti-rejeu", async () => {
    const fetchMock = installSuccessfulFetchMock();
    const body = JSON.stringify(validPayload);
    const nonce = "ABCDEF0123456789ABCDEF0123456789";
    const app = createVercelApiApp();
    const response = await app.request("/api/gps/ingest", {
      method: "POST",
      headers: signedHeaders(body, nonce),
      body,
    });
    expect(response.status).toBe(200);
    const rpcCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/rest/v1/rpc/gps_claim_gateway_nonce"),
    );
    expect(rpcCall).toBeDefined();
    expect(JSON.parse(String(rpcCall?.[1]?.body))).toMatchObject({
      p_gateway_id: "gateway-test",
      p_nonce: nonce.toLowerCase(),
    });
  });

  it("conserve le status, le content-type et no-store de la reponse upstream", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/rest/v1/rpc/gps_claim_gateway_nonce")) {
        return new Response("true", { status: 200 });
      }
      return new Response("accepted", {
        status: 202,
        headers: { "Content-Type": "text/plain" },
      });
    }) as typeof fetch;
    const response = await postSignedPayload(validPayload, "2723456789abcdef0123456789abcdef");
    expect(response.status).toBe(202);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("accepted");
  });

  it("utilise application/json quand upstream ne fournit pas de content-type", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/rest/v1/rpc/gps_claim_gateway_nonce")) {
        return new Response("true", { status: 200 });
      }
      const response = new Response("{}", { status: 200 });
      response.headers.delete("content-type");
      return response;
    }) as typeof fetch;
    const response = await postSignedPayload(validPayload, "2823456789abcdef0123456789abcdef");
    expect(response.headers.get("content-type")).toBe("application/json");
  });

  it("route explicitement l'ingest GPS vers la fonction Vercel catch-all", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("api/[...path].ts", "utf8");
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      rewrites?: Array<{ source?: string; destination?: string }>;
    };

    expect(source).toContain('from "@hono/node-server/vercel"');
    expect(source).toContain("createVercelApiApp");
    expect(vercel.rewrites).toContainEqual({
      source: "/api/gps/ingest",
      destination: "/api/[...path]",
    });
  });
});
