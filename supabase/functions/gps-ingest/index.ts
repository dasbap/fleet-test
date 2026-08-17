import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const gpsPayloadSchema = z.object({
  protocol: z.enum(["tk103", "concox", "teltonika"]),
  imei: z.string().min(14).max(17),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).max(300).optional(),
  heading: z.number().min(0).max(360).optional(),
  altitudeM: z.number().optional(),
  trackerTime: z.string().min(6).max(24),
  rawPayload: z.string().max(4000).optional(),
});

type GpsPayload = z.infer<typeof gpsPayloadSchema>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseTrackerTime(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    const yy = Number(digits.slice(0, 2));
    const mm = Number(digits.slice(2, 4));
    const dd = Number(digits.slice(4, 6));
    const hh = Number(digits.slice(6, 8));
    const min = Number(digits.slice(8, 10));
    return new Date(Date.UTC(2000 + yy, mm - 1, dd, hh, min, 0)).toISOString();
  }

  if (digits.length === 12) {
    const yy = Number(digits.slice(0, 2));
    const mm = Number(digits.slice(2, 4));
    const dd = Number(digits.slice(4, 6));
    const hh = Number(digits.slice(6, 8));
    const min = Number(digits.slice(8, 10));
    const ss = Number(digits.slice(10, 12));
    return new Date(Date.UTC(2000 + yy, mm - 1, dd, hh, min, ss)).toISOString();
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function isInsideCircle(
  latitude: number,
  longitude: number,
  centerLat: number,
  centerLng: number,
  radiusM: number,
): boolean {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(centerLat - latitude);
  const dLng = toRad(centerLng - longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latitude)) * Math.cos(toRad(centerLat)) * Math.sin(dLng / 2) ** 2;
  const distance = 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= radiusM;
}

function isInsidePolygon(latitude: number, longitude: number, polygon: GeoJSON.Polygon): boolean {
  const ring = polygon.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function geofenceContainsPosition(
  geofence: {
    geofence_type: "circle" | "polygon";
    center_lat: number | null;
    center_lng: number | null;
    radius_m: number | null;
    polygon_geojson: GeoJSON.Polygon | null;
  },
  latitude: number,
  longitude: number,
) {
  if (
    geofence.geofence_type === "circle" &&
    geofence.center_lat != null &&
    geofence.center_lng != null &&
    geofence.radius_m != null
  ) {
    return isInsideCircle(latitude, longitude, geofence.center_lat, geofence.center_lng, geofence.radius_m);
  }

  if (geofence.geofence_type === "polygon" && geofence.polygon_geojson) {
    return isInsidePolygon(latitude, longitude, geofence.polygon_geojson);
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  const ingestKey = Deno.env.get("GPS_INGEST_KEY");
  const incomingKey = req.headers.get("x-gps-ingest-key");
  if (!ingestKey || !incomingKey || incomingKey !== ingestKey) {
    return jsonResponse({ error: "Clé d'ingestion invalide." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    return jsonResponse({ error: "Configuration Supabase manquante." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  try {
    const raw = await req.json();
    const payload = gpsPayloadSchema.parse(raw) as GpsPayload;
    const trackerTime = parseTrackerTime(payload.trackerTime);

    const { data: device, error: deviceError } = await supabase
      .from("gps_devices")
      .select("fleet_id, vehicle_id, imei, is_active, speed_limit_kmh, speed_alert_tolerance_kmh")
      .eq("imei", payload.imei)
      .eq("is_active", true)
      .maybeSingle();

    if (deviceError) {
      throw new Error(deviceError.message);
    }

    if (!device) {
      await supabase.from("gps_ingest_logs").insert({
        imei: payload.imei,
        status: "rejected",
        reason: "imei_not_registered",
        payload,
      });
      return jsonResponse({ ok: false, reason: "imei_not_registered" }, 404);
    }

    const positionInsert = {
      fleet_id: device.fleet_id,
      vehicle_id: device.vehicle_id,
      tracker_imei: payload.imei,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed_kmh: payload.speedKmh ?? null,
      heading: payload.heading ?? null,
      altitude_m: payload.altitudeM ?? null,
      tracker_time: trackerTime,
      raw_payload: payload.rawPayload ?? null,
    };

    const { error: positionError } = await supabase.from("vehicle_positions").insert(positionInsert);
    if (positionError) {
      throw new Error(positionError.message);
    }

    const { data: latest } = await supabase
      .from("vehicle_positions_latest")
      .select("tracker_time")
      .eq("vehicle_id", device.vehicle_id)
      .maybeSingle();

    if (!latest || new Date(trackerTime).getTime() >= new Date(latest.tracker_time).getTime()) {
      await supabase.from("vehicle_positions_latest").upsert(
        {
          ...positionInsert,
          vehicle_id: device.vehicle_id,
          fleet_id: device.fleet_id,
        },
        { onConflict: "vehicle_id" },
      );
    }

    if (payload.speedKmh != null) {
      const speedLimitKmh = Number(device.speed_limit_kmh ?? 90);
      const speedToleranceKmh = Number(device.speed_alert_tolerance_kmh ?? 5);
      const speedThresholdKmh = speedLimitKmh + speedToleranceKmh;
      const isSpeeding = payload.speedKmh > speedThresholdKmh;

      const { data: previousSpeedState, error: previousSpeedError } = await supabase
        .from("vehicle_speed_states")
        .select("is_speeding")
        .eq("vehicle_id", device.vehicle_id)
        .maybeSingle();

      if (previousSpeedError) {
        throw new Error(previousSpeedError.message);
      }

      const { error: speedStateError } = await supabase.from("vehicle_speed_states").upsert(
        {
          vehicle_id: device.vehicle_id,
          fleet_id: device.fleet_id,
          tracker_imei: payload.imei,
          is_speeding: isSpeeding,
          speed_kmh: payload.speedKmh,
          speed_limit_kmh: speedLimitKmh,
          threshold_kmh: speedThresholdKmh,
          tracker_time: trackerTime,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "vehicle_id" },
      );

      if (speedStateError) {
        throw new Error(speedStateError.message);
      }

      if (isSpeeding && previousSpeedState?.is_speeding !== true) {
        const { error: speedingAlertError } = await supabase.from("alertes_automatiques").insert({
          fleet_id: device.fleet_id,
          alert_type: "speeding",
          vehicle_id: device.vehicle_id,
          severity: "high",
          message: `Exces de vitesse: ${Math.round(payload.speedKmh)} km/h pour une limite de ${speedLimitKmh} km/h`,
          resolved: false,
          created_at: new Date().toISOString(),
        });

        if (speedingAlertError) {
          throw new Error(speedingAlertError.message);
        }
      }
    }

    const { data: geofences } = await supabase
      .from("geofences")
      .select("id, geofence_type, center_lat, center_lng, radius_m, polygon_geojson")
      .eq("fleet_id", device.fleet_id)
      .eq("is_active", true);

    if (geofences && geofences.length > 0) {
      const geofenceIds = geofences.map((zone) => zone.id);
      const { data: stateRows } = await supabase
        .from("geofence_vehicle_states")
        .select("geofence_id, is_inside")
        .eq("vehicle_id", device.vehicle_id)
        .in("geofence_id", geofenceIds);

      const stateMap = new Map((stateRows ?? []).map((row) => [row.geofence_id, row.is_inside]));

      for (const geofence of geofences) {
        const isInside = geofenceContainsPosition(
          geofence as {
            geofence_type: "circle" | "polygon";
            center_lat: number | null;
            center_lng: number | null;
            radius_m: number | null;
            polygon_geojson: GeoJSON.Polygon | null;
          },
          payload.latitude,
          payload.longitude,
        );
        const previous = stateMap.get(geofence.id);
        const changed = previous !== undefined && previous !== isInside;

        await supabase.from("geofence_vehicle_states").upsert({
          geofence_id: geofence.id,
          vehicle_id: device.vehicle_id,
          fleet_id: device.fleet_id,
          is_inside: isInside,
          updated_at: new Date().toISOString(),
        });

        if (changed) {
          await supabase.from("geofence_events").insert({
            fleet_id: device.fleet_id,
            vehicle_id: device.vehicle_id,
            geofence_id: geofence.id,
            event_type: isInside ? "enter" : "exit",
            occurred_at: trackerTime,
            latitude: payload.latitude,
            longitude: payload.longitude,
            tracker_imei: payload.imei,
            metadata: {
              protocol: payload.protocol,
              speedKmh: payload.speedKmh ?? null,
              heading: payload.heading ?? null,
            },
          });
        }
      }
    }

    await supabase.from("gps_ingest_logs").insert({
      fleet_id: device.fleet_id,
      imei: payload.imei,
      status: "accepted",
      reason: null,
      payload,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[gps-ingest] error:", message);
    return jsonResponse({ error: message }, 400);
  }
});
