import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Context, Hono } from "hono";
import { z } from "zod";
import {
  getGpsIngestKey,
  getGpsIngestUrl,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "../../env.js";

const MAX_GATEWAY_CLOCK_SKEW_MS = 2 * 60 * 1000;
const MAX_GATEWAY_FUTURE_SKEW_MS = 30 * 1000;
const MIN_NONCE_RETENTION_MS = 30 * 1000;
const MAX_GPS_INGEST_BODY_BYTES = 16 * 1024;

const gpsPayloadSchema = z.object({
  protocol: z.enum(["tk103", "concox", "teltonika"]),
  imei: z.string().regex(/^\d{14,17}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).max(300).optional(),
  heading: z.number().min(0).max(360).optional(),
  altitudeM: z.number().min(-1000).max(20_000).optional(),
  trackerTime: z.string().datetime({ offset: true }),
  rawPayload: z.string().max(4000).optional(),
});

interface VerifiedGatewayRequest {
  gatewayId: string;
  nonce: string;
  expiresAt: string;
}

function getGatewaySecrets(): Record<string, string> {
  const raw = process.env.GPS_GATEWAY_SECRETS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([id, secret]) =>
          id.length > 0 &&
          id.length <= 128 &&
          typeof secret === "string" &&
          secret.length >= 32,
      ),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function getGatewayDeviceBindings(): Record<string, string[]> {
  const raw = process.env.GPS_GATEWAY_DEVICE_BINDINGS;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const bindings: Record<string, string[]> = {};
    for (const [gatewayId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!gatewayId || gatewayId.length > 128 || !Array.isArray(value)) continue;
      const imeis = value.filter(
        (imei): imei is string => typeof imei === "string" && /^\d{14,17}$/.test(imei),
      );
      if (imeis.length > 0) bindings[gatewayId] = [...new Set(imeis)];
    }
    return bindings;
  } catch {
    return {};
  }
}

function isGatewayAuthorizedForImei(gatewayId: string, imei: string): boolean {
  return getGatewayDeviceBindings()[gatewayId]?.includes(imei) === true;
}

function safeHexEqual(actualHex: string, expected: Buffer): boolean {
  if (!/^[0-9a-f]{64}$/i.test(actualHex)) return false;
  const actual = Buffer.from(actualHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function verifyGatewayRequest(c: Context, rawBody: string): VerifiedGatewayRequest | null {
  const gatewayId = c.req.header("x-gps-gateway-id") ?? "";
  const timestampRaw = c.req.header("x-gps-timestamp") ?? "";
  const nonce = c.req.header("x-gps-nonce") ?? "";
  const signature = c.req.header("x-gps-signature") ?? "";
  const secret = getGatewaySecrets()[gatewayId];
  const timestamp = Number(timestampRaw);
  const now = Date.now();

  if (!secret || !Number.isSafeInteger(timestamp)) return null;
  if (now - timestamp > MAX_GATEWAY_CLOCK_SKEW_MS) return null;
  if (timestamp - now > MAX_GATEWAY_FUTURE_SKEW_MS) return null;
  if (!/^[0-9a-f]{32}$/i.test(nonce)) return null;

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const expected = createHmac("sha256", secret)
    .update(`${gatewayId}.${timestampRaw}.${nonce}.${payloadHash}`)
    .digest();

  if (!safeHexEqual(signature, expected)) return null;

  const replayWindowEnd = timestamp + MAX_GATEWAY_CLOCK_SKEW_MS;
  const minimumRetentionEnd = now + MIN_NONCE_RETENTION_MS;

  return {
    gatewayId,
    nonce: nonce.toLowerCase(),
    expiresAt: new Date(Math.max(replayWindowEnd, minimumRetentionEnd)).toISOString(),
  };
}

async function claimGatewayNonce(request: VerifiedGatewayRequest): Promise<boolean> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing for GPS replay protection");
  }

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/gps_claim_gateway_nonce`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      p_gateway_id: request.gatewayId,
      p_nonce: request.nonce,
      p_expires_at: request.expiresAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`GPS nonce claim failed with HTTP ${response.status}`);
  }

  return (await response.json()) === true;
}

async function handleGpsIngest(c: Context) {
  const contentLengthRaw = c.req.header("content-length");
  if (contentLengthRaw) {
    const contentLength = Number(contentLengthRaw);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return c.json({ error: "Content-Length invalide" }, 400);
    }
    if (contentLength > MAX_GPS_INGEST_BODY_BYTES) {
      return c.json({ error: "Payload GPS trop volumineux" }, 413);
    }
  }

  let rawBody: string;
  try {
    rawBody = await c.req.text();
  } catch {
    return c.json({ error: "Corps invalide" }, 400);
  }

  if (Buffer.byteLength(rawBody, "utf8") > MAX_GPS_INGEST_BODY_BYTES) {
    return c.json({ error: "Payload GPS trop volumineux" }, 413);
  }

  const verifiedGateway = verifyGatewayRequest(c, rawBody);
  if (!verifiedGateway) {
    return c.json({ error: "Authentification gateway GPS invalide." }, 401);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Corps JSON invalide" }, 400);
  }

  const parsed = gpsPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Donnees GPS invalides", details: parsed.error.flatten() }, 400);
  }

  if (!isGatewayAuthorizedForImei(verifiedGateway.gatewayId, parsed.data.imei)) {
    return c.json({ error: "IMEI non autorise pour ce gateway GPS." }, 403);
  }

  try {
    if (!(await claimGatewayNonce(verifiedGateway))) {
      return c.json({ error: "Rejeu gateway GPS detecte." }, 409);
    }
  } catch (error) {
    console.error("[gps/ingest] replay protection unavailable:", error);
    return c.json({ error: "Protection anti-rejeu indisponible." }, 503);
  }

  const ingestKey = getGpsIngestKey();
  if (!ingestKey) {
    return c.json({ error: "Configuration ingestion GPS manquante." }, 500);
  }

  const response = await fetch(getGpsIngestUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ingestKey}`,
      "x-gps-ingest-key": ingestKey,
    },
    body: JSON.stringify(parsed.data),
  });

  const responseBody = await response.text();
  return new Response(responseBody, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function registerGpsIngestRoutes(app: Hono) {
  app.post("/gps/ingest", handleGpsIngest);
}
