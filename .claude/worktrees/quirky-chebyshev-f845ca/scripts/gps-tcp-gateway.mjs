import net from "node:net";

const port = Number(process.env.GPS_TCP_PORT ?? 5023);
const edgeIngestUrl = process.env.GPS_INGEST_URL ?? "";
const edgeIngestKey = process.env.GPS_INGEST_KEY ?? "";

if (!edgeIngestUrl || !edgeIngestKey) {
  throw new Error("GPS_INGEST_URL et GPS_INGEST_KEY sont requis.");
}

function toDecimalDegrees(rawValue, hemisphere) {
  if (!rawValue) return null;
  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed)) return null;

  // Format courant TK103/Concox: ddmm.mmmm (lat), dddmm.mmmm (lng)
  const degreePart = hemisphere === "N" || hemisphere === "S" ? 2 : 3;
  const degrees = Math.floor(parsed / 10 ** (String(Math.floor(parsed)).length - degreePart));
  const minutes = parsed - degrees * 100;
  const decimal = degrees + minutes / 60;
  if (hemisphere === "S" || hemisphere === "W") {
    return -decimal;
  }
  return decimal;
}

function parseTk103Line(line) {
  // Exemple: imei:123456789012345,tracker,2404150930,,F,0130.1234,N,01030.1234,E,38.3,180;
  const match = line.match(
    /imei:(\d{14,17}),[^,]*,(\d{10}),[^,]*,[FL],([\d.]+),([NS]),([\d.]+),([EW]),([\d.]+),([\d.]+)/i,
  );
  if (!match) return null;

  const [, imei, dateTimeRaw, latRaw, ns, lngRaw, ew, speedRaw, headingRaw] = match;
  const latitude = toDecimalDegrees(latRaw, ns);
  const longitude = toDecimalDegrees(lngRaw, ew);
  if (latitude == null || longitude == null) return null;

  return {
    protocol: "tk103",
    imei,
    latitude,
    longitude,
    speedKmh: Number.parseFloat(speedRaw),
    heading: Number.parseFloat(headingRaw),
    trackerTime: dateTimeRaw,
    rawPayload: line,
  };
}

function parseConcoxLine(line) {
  // Exemple simplifié: ##,imei:123456789012345,A,240415,093000,3.84812,11.51740,42.5,90
  const match = line.match(
    /imei:(\d{14,17}),A,(\d{6}),(\d{6}),(-?\d+\.\d+),(-?\d+\.\d+),([\d.]+),([\d.]+)/i,
  );
  if (!match) return null;

  const [, imei, dateRaw, timeRaw, latRaw, lngRaw, speedRaw, headingRaw] = match;

  return {
    protocol: "concox",
    imei,
    latitude: Number.parseFloat(latRaw),
    longitude: Number.parseFloat(lngRaw),
    speedKmh: Number.parseFloat(speedRaw),
    heading: Number.parseFloat(headingRaw),
    trackerTime: `${dateRaw}${timeRaw}`,
    rawPayload: line,
  };
}

function parseTrackerLine(line) {
  return parseTk103Line(line) ?? parseConcoxLine(line);
}

async function pushToIngest(payload) {
  const response = await fetch(edgeIngestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${edgeIngestKey}`,
      "x-gps-ingest-key": edgeIngestKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ingestion HTTP ${response.status}: ${body}`);
  }
}

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");

  socket.on("data", async (chunk) => {
    const lines = chunk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const parsed = parseTrackerLine(line);
      if (!parsed) {
        console.warn("[gps-tcp-gateway] Trame non reconnue:", line);
        continue;
      }

      try {
        await pushToIngest(parsed);
      } catch (error) {
        console.error("[gps-tcp-gateway] Erreur ingestion:", error);
      }
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[gps-tcp-gateway] Serveur TCP démarré sur ${port}`);
});
