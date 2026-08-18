import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Context, Hono } from "hono";
import { z } from "zod";
import { getGpsIngestKey, getGpsIngestUrl } from "../../env.js";

const MAX_GATEWAY_CLOCK_SKEW_MS = 2 * 60 * 1000;
const usedNonces = new Map<string, number>();

const gpsPayloadSchema = z.object({
  protocol: z.enum(["tk103", "concox", "teltonika"]),
  imei: z.string().regex(/^\d{14,17}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).max(300).optional(),
  heading: z.number().min(0).max(360).optional(),
  altitudeM: z.number().min(-1000).max(20_000).optional(),
  trackerTime: z.string().min(6).max(32),
  rawPayload: z.string().max(4000).optional(),
});

function getGatewaySecrets(): Record<string, string> {
  const raw = process.env.GPS_GATEWAY_SECRETS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([id, secret]) => id.length > 0 && typeof secret === "string" && secret.length >= 32,
      ),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function safeHexEqual(actualHex: string, expected: Buffer): boolean {
  if (!/^[0-9a-f]{64}$/i.test(actualHex)) return false;
  const actual = Buffer.from(actualHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function pruneNonces(now: number) {
  for (const [key, expiresAt] of usedNonces) {
    if (expiresAt <= now) usedNonces.delete(key);
  }
}

function verifyGatewayRequest(c: Context, rawBody: string): boolean {
  const gatewayId = c.req.header("x-gps-gateway-id") ?? "";
  const timestampRaw = c.req.header("x-gps-timestamp") ?? "";
  const nonce = c.req.header("x-gps-nonce") ?? "";
  const signature = c.req.header("x-gps-signature") ?? "";
  const secret = getGatewaySecrets()[gatewayId];
  const timestamp = Number(timestampRaw);
  const now = Date.now();

  if (!secret || !Number.isSafeInteger(timestamp)) return false;
  if (Math.abs(now - timestamp) > MAX_GATEWAY_CLOCK_SKEW_MS) return false;
  if (!/^[0-9a-f]{32}$/i.test(nonce)) return false;

  pruneNonces(now);
  const nonceKey = `${gatewayId}:${nonce}`;
  if (usedNonces.has(nonceKey)) return false;

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const expected = createHmac("sha256", secret)
    .update(`${gatewayId}.${timestampRaw}.${nonce}.${payloadHash}`)
    .digest();

  if (!safeHexEqual(signature, expected)) return false;
  usedNonces.set(nonceKey, now + MAX_GATEWAY_CLOCK_SKEW_MS);
  return true;
}

async function handleGpsIngest(c: Context) {
  let rawBody: string;
  try {
    rawBody = await c.req.text();
  } catch {
    return c.json({ error: "Corps invalide" }, 400);
  }

  if (!verifyGatewayRequest(c, rawBody)) {
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
