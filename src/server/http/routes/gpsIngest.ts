import type { Context, Hono } from "hono";
import { z } from "zod";
import { getGpsIngestKey, getGpsIngestUrl } from "../../env.js";

const gpsPayloadSchema = z.object({
  protocol: z.enum(["tk103", "concox", "teltonika"]),
  imei: z.string().min(14).max(17),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).max(300).optional(),
  heading: z.number().min(0).max(360).optional(),
  altitudeM: z.number().optional(),
  trackerTime: z.string().min(6).max(32),
  rawPayload: z.string().max(4000).optional(),
});

async function handleGpsIngest(c: Context) {
  const ingestKey = getGpsIngestKey();
  const incomingKey = c.req.header("x-gps-ingest-key");

  if (!ingestKey || !incomingKey || incomingKey !== ingestKey) {
    return c.json({ error: "Cle d'ingestion GPS invalide." }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Corps JSON invalide" }, 400);
  }

  const parsed = gpsPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Donnees GPS invalides", details: parsed.error.flatten() }, 400);
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
    },
  });
}

export function registerGpsIngestRoutes(app: Hono) {
  app.post("/gps/ingest", handleGpsIngest);
}
