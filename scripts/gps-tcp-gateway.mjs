import net from "node:net";
import { fileURLToPath } from "node:url";

const TELTONIKA_IMEI_LENGTH_BYTES = 2;
const GT06_START = 0x78;
const GT06_STOP_CR = 0x0d;
const GT06_STOP_LF = 0x0a;

export function createGpsTcpSession() {
  return {
    imei: null,
    textBuffer: "",
    binaryBuffer: Buffer.alloc(0),
  };
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

function readSignedInt32(buffer, offset) {
  return buffer.readInt32BE(offset);
}

function skipTeltonikaIoElements(buffer, offset, codecId) {
  if (codecId === 0x8e) {
    const eventIoId = buffer.readUInt16BE(offset);
    const totalIo = buffer.readUInt16BE(offset + 2);
    let cursor = offset + 4;
    for (const valueSize of [1, 2, 4, 8]) {
      const count = buffer.readUInt16BE(cursor);
      cursor += 2 + count * (2 + valueSize);
    }
    const variableCount = buffer.readUInt16BE(cursor);
    cursor += 2;
    for (let index = 0; index < variableCount; index += 1) {
      cursor += 2;
      const valueLength = buffer.readUInt16BE(cursor);
      cursor += 2 + valueLength;
    }
    return { cursor, eventIoId, totalIo };
  }

  const eventIoId = buffer[offset];
  const totalIo = buffer[offset + 1];
  let cursor = offset + 2;
  for (const valueSize of [1, 2, 4, 8]) {
    const count = buffer[cursor];
    cursor += 1 + count * (1 + valueSize);
  }
  return { cursor, eventIoId, totalIo };
}

function parseTeltonikaImei(buffer) {
  if (buffer.length < TELTONIKA_IMEI_LENGTH_BYTES) return null;
  const length = buffer.readUInt16BE(0);
  const end = TELTONIKA_IMEI_LENGTH_BYTES + length;
  if (buffer.length !== end || length < 14 || length > 17) return null;
  const imei = buffer.subarray(TELTONIKA_IMEI_LENGTH_BYTES, end).toString("ascii");
  if (!/^\d{14,17}$/.test(imei)) return null;
  return imei;
}

function parseTeltonikaPacket(session, buffer) {
  if (buffer.length < 12 || buffer.readUInt32BE(0) !== 0) return null;
  const dataLength = buffer.readUInt32BE(4);
  const totalLength = 8 + dataLength + 4;
  if (buffer.length !== totalLength) return null;

  const codecId = buffer[8];
  if (codecId !== 0x08 && codecId !== 0x8e) return null;

  const recordsCount = buffer[9];
  let cursor = 10;
  const messages = [];

  for (let index = 0; index < recordsCount; index += 1) {
    const timestampMs = Number(buffer.readBigUInt64BE(cursor));
    cursor += 8;
    cursor += 1;

    const longitude = readSignedInt32(buffer, cursor) / 10_000_000;
    cursor += 4;
    const latitude = readSignedInt32(buffer, cursor) / 10_000_000;
    cursor += 4;
    const altitude = buffer.readInt16BE(cursor);
    cursor += 2;
    const heading = buffer.readUInt16BE(cursor);
    cursor += 2;
    cursor += 1;
    const speedKmh = buffer.readUInt16BE(cursor);
    cursor += 2;

    const io = skipTeltonikaIoElements(buffer, cursor, codecId);
    cursor = io.cursor;

    messages.push({
      protocol: "teltonika",
      imei: session.imei,
      latitude,
      longitude,
      speedKmh,
      heading,
      altitudeM: altitude,
      trackerTime: new Date(timestampMs).toISOString(),
      rawPayload: buffer.toString("hex"),
    });
  }

  const secondRecordsCount = buffer[cursor];
  if (secondRecordsCount !== recordsCount) return null;

  return {
    messages,
    acks: [Buffer.from([0, 0, 0, recordsCount])],
  };
}

function crc16Gt06(buffer) {
  let crc = 0xffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x0001 ? (crc >> 1) ^ 0x8408 : crc >> 1;
    }
  }
  return (~crc) & 0xffff;
}

function buildGt06Ack(protocol, serialNumber) {
  const body = Buffer.from([0x05, protocol, serialNumber >> 8, serialNumber & 0xff]);
  const crc = crc16Gt06(body);
  return Buffer.from([
    GT06_START,
    GT06_START,
    ...body,
    crc >> 8,
    crc & 0xff,
    GT06_STOP_CR,
    GT06_STOP_LF,
  ]);
}

function decodeBcd(buffer) {
  return [...buffer]
    .map((byte) => `${byte >> 4}${byte & 0x0f}`)
    .join("");
}

function parseGt06Date(buffer, offset) {
  const year = 2000 + buffer[offset];
  const month = buffer[offset + 1] - 1;
  const day = buffer[offset + 2];
  const hour = buffer[offset + 3];
  const minute = buffer[offset + 4];
  const second = buffer[offset + 5];
  return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
}

function parseGt06Packet(session, buffer) {
  if (
    buffer.length < 10 ||
    buffer[0] !== GT06_START ||
    buffer[1] !== GT06_START ||
    buffer[buffer.length - 2] !== GT06_STOP_CR ||
    buffer[buffer.length - 1] !== GT06_STOP_LF
  ) {
    return null;
  }

  const packetLength = buffer[2];
  if (buffer.length !== packetLength + 5) return null;

  const protocol = buffer[3];
  const serialOffset = buffer.length - 6;
  const serialNumber = buffer.readUInt16BE(serialOffset);
  const ack = buildGt06Ack(protocol, serialNumber);

  if (protocol === 0x01) {
    session.imei = decodeBcd(buffer.subarray(4, 12)).replace(/^0/, "");
    return { messages: [], acks: [ack] };
  }

  if (protocol === 0x13) {
    return { messages: [], acks: [ack] };
  }

  if (protocol !== 0x12 && protocol !== 0x16) {
    return { messages: [], acks: [] };
  }

  const gpsInfo = buffer[10];
  const rawLatitude = buffer.readUInt32BE(11);
  const rawLongitude = buffer.readUInt32BE(15);
  const courseStatus = buffer.readUInt16BE(20);
  const isWest = Boolean(courseStatus & 0x0800);
  const isNorth = Boolean(courseStatus & 0x0400);
  const latitude = (isNorth ? 1 : -1) * (rawLatitude / 1_800_000);
  const longitude = (isWest ? -1 : 1) * (rawLongitude / 1_800_000);

  return {
    messages: [
      {
        protocol: "concox",
        imei: session.imei,
        latitude,
        longitude,
        speedKmh: buffer[19],
        heading: courseStatus & 0x03ff,
        trackerTime: parseGt06Date(buffer, 4),
        satellites: gpsInfo & 0x0f,
        rawPayload: buffer.toString("hex"),
      },
    ],
    acks: [ack],
  };
}

function parseBinaryFrame(session, buffer) {
  const teltonikaImei = parseTeltonikaImei(buffer);
  if (teltonikaImei) {
    session.imei = teltonikaImei;
    return { messages: [], acks: [Buffer.from([0x01])] };
  }

  return parseTeltonikaPacket(session, buffer) ?? parseGt06Packet(session, buffer);
}

function getExpectedBinaryFrameLength(buffer) {
  if (buffer.length === 0) return undefined;

  if (buffer[0] === 0) {
    if (buffer.length < 2) return undefined;

    if (buffer.length >= 4 && buffer.readUInt32BE(0) === 0) {
      if (buffer.length < 8) return undefined;
      return 8 + buffer.readUInt32BE(4) + 4;
    }

    const imeiLength = buffer.readUInt16BE(0);
    if (imeiLength >= 14 && imeiLength <= 17) {
      return TELTONIKA_IMEI_LENGTH_BYTES + imeiLength;
    }
  }

  if (buffer[0] === GT06_START) {
    if (buffer.length < 2) return undefined;
    if (buffer[1] !== GT06_START) return null;
    if (buffer.length < 3) return undefined;
    return buffer[2] + 5;
  }

  return null;
}

function parseTextPayload(buffer) {
  return buffer
    .toString("utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseTrackerLine(line))
    .filter(Boolean);
}

export function parseTcpChunk(session, chunk) {
  session.binaryBuffer = Buffer.concat([
    session.binaryBuffer,
    Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
  ]);

  const messages = [];
  const acks = [];

  while (session.binaryBuffer.length > 0) {
    const expectedLength = getExpectedBinaryFrameLength(session.binaryBuffer);

    if (expectedLength === undefined) break;

    if (expectedLength === null) {
      messages.push(...parseTextPayload(session.binaryBuffer));
      session.binaryBuffer = Buffer.alloc(0);
      break;
    }

    if (session.binaryBuffer.length < expectedLength) break;

    const frame = session.binaryBuffer.subarray(0, expectedLength);
    session.binaryBuffer = session.binaryBuffer.subarray(expectedLength);
    const parsedBinary = parseBinaryFrame(session, frame);

    if (!parsedBinary) {
      messages.push(...parseTextPayload(frame));
      continue;
    }

    messages.push(...parsedBinary.messages);
    acks.push(...parsedBinary.acks);
  }

  return { messages, acks };
}

async function pushToIngest(payload, edgeIngestUrl, edgeIngestKey) {
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

export function createGpsTcpServer({ edgeIngestUrl, edgeIngestKey }) {
  if (!edgeIngestUrl || !edgeIngestKey) {
    throw new Error("GPS_INGEST_URL et GPS_INGEST_KEY sont requis.");
  }
  if (!edgeIngestUrl.startsWith("https://")) {
    throw new Error("GPS_INGEST_URL doit utiliser HTTPS.");
  }

  return net.createServer((socket) => {
    const session = createGpsTcpSession();

    socket.on("data", async (chunk) => {
      const parsed = parseTcpChunk(session, chunk);
      for (const ack of parsed.acks) {
        socket.write(ack);
      }

      if (parsed.messages.length === 0 && parsed.acks.length === 0) {
        console.warn("[gps-tcp-gateway] Trame non reconnue:", chunk.toString("hex"));
        return;
      }

      for (const message of parsed.messages) {
        if (!message.imei) {
          console.warn("[gps-tcp-gateway] Trame ignoree sans IMEI de session:", message.rawPayload);
          continue;
        }

        try {
          await pushToIngest(message, edgeIngestUrl, edgeIngestKey);
        } catch (error) {
          console.error("[gps-tcp-gateway] Erreur ingestion:", error);
        }
      }
    });
  });
}

export function startGpsTcpServer() {
  const port = Number(process.env.GPS_TCP_PORT ?? 5027);
  const edgeIngestUrl = process.env.GPS_INGEST_URL ?? "";
  const edgeIngestKey = process.env.GPS_INGEST_KEY ?? "";
  const server = createGpsTcpServer({ edgeIngestUrl, edgeIngestKey });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[gps-tcp-gateway] Serveur TCP demarre sur ${port}`);
  });

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    startGpsTcpServer();
  } catch (error) {
    console.error("[gps-tcp-gateway] Demarrage impossible:", error);
    process.exitCode = 1;
  }
}
