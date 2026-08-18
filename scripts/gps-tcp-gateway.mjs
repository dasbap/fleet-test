import net from "node:net";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const TELTONIKA_IMEI_LENGTH_BYTES = 2;
const GT06_START = 0x78;
const GT06_STOP_CR = 0x0d;
const GT06_STOP_LF = 0x0a;
const MAX_BINARY_FRAME_BYTES = 64 * 1024;
const MAX_SESSION_BUFFER_BYTES = 128 * 1024;
const SOCKET_IDLE_TIMEOUT_MS = 60_000;

export function createGpsTcpSession() {
  return {
    imei: null,
    binaryBuffer: Buffer.alloc(0),
  };
}

function bindSessionImei(session, imei) {
  if (session.imei && session.imei !== imei) {
    throw new Error("GPS_SESSION_IMEI_CHANGED");
  }
  session.imei = imei;
}

function toDecimalDegrees(rawValue, hemisphere) {
  if (!rawValue) return null;
  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed)) return null;
  const degreePart = hemisphere === "N" || hemisphere === "S" ? 2 : 3;
  const degrees = Math.floor(parsed / 10 ** (String(Math.floor(parsed)).length - degreePart));
  const minutes = parsed - degrees * 100;
  const decimal = degrees + minutes / 60;
  return hemisphere === "S" || hemisphere === "W" ? -decimal : decimal;
}

function parseTk103Line(line) {
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

function crc16Ibm(buffer) {
  let crc = 0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return crc & 0xffff;
}

function crc16Gt06(buffer) {
  let crc = 0xffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >> 1) ^ 0x8408 : crc >> 1;
    }
  }
  return (~crc) & 0xffff;
}

function parseTeltonikaImei(buffer) {
  if (buffer.length < TELTONIKA_IMEI_LENGTH_BYTES) return null;
  const length = buffer.readUInt16BE(0);
  const end = TELTONIKA_IMEI_LENGTH_BYTES + length;
  if (buffer.length !== end || length < 14 || length > 17) return null;
  const imei = buffer.subarray(TELTONIKA_IMEI_LENGTH_BYTES, end).toString("ascii");
  return /^\d{14,17}$/.test(imei) ? imei : null;
}

function assertReadable(buffer, offset, length) {
  if (offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error("GPS_FRAME_OUT_OF_BOUNDS");
  }
}

function skipTeltonikaIoElements(buffer, offset, codecId, dataEnd) {
  let cursor = offset;
  if (codecId === 0x8e) {
    assertReadable(buffer, cursor, 4);
    cursor += 4;
    for (const valueSize of [1, 2, 4, 8]) {
      assertReadable(buffer, cursor, 2);
      const count = buffer.readUInt16BE(cursor);
      cursor += 2;
      const bytes = count * (2 + valueSize);
      assertReadable(buffer, cursor, bytes);
      cursor += bytes;
    }
    assertReadable(buffer, cursor, 2);
    const variableCount = buffer.readUInt16BE(cursor);
    cursor += 2;
    for (let index = 0; index < variableCount; index += 1) {
      assertReadable(buffer, cursor, 4);
      cursor += 2;
      const valueLength = buffer.readUInt16BE(cursor);
      cursor += 2;
      assertReadable(buffer, cursor, valueLength);
      cursor += valueLength;
    }
  } else {
    assertReadable(buffer, cursor, 2);
    cursor += 2;
    for (const valueSize of [1, 2, 4, 8]) {
      assertReadable(buffer, cursor, 1);
      const count = buffer[cursor];
      cursor += 1;
      const bytes = count * (1 + valueSize);
      assertReadable(buffer, cursor, bytes);
      cursor += bytes;
    }
  }
  if (cursor > dataEnd) throw new Error("GPS_FRAME_OUT_OF_BOUNDS");
  return cursor;
}

function parseTeltonikaPacket(session, buffer) {
  if (buffer.length < 12 || buffer.readUInt32BE(0) !== 0) return null;
  const dataLength = buffer.readUInt32BE(4);
  if (dataLength <= 0 || dataLength > MAX_BINARY_FRAME_BYTES - 12) return null;
  const totalLength = 8 + dataLength + 4;
  if (buffer.length !== totalLength) return null;
  const dataStart = 8;
  const dataEnd = dataStart + dataLength;
  const receivedCrc = buffer.readUInt32BE(dataEnd) & 0xffff;
  const calculatedCrc = crc16Ibm(buffer.subarray(dataStart, dataEnd));
  if (receivedCrc !== calculatedCrc) return null;
  const codecId = buffer[8];
  if (codecId !== 0x08 && codecId !== 0x8e) return null;
  const recordsCount = buffer[9];
  let cursor = 10;
  const messages = [];
  for (let index = 0; index < recordsCount; index += 1) {
    assertReadable(buffer, cursor, 24);
    const timestampMs = Number(buffer.readBigUInt64BE(cursor));
    cursor += 8;
    cursor += 1;
    const longitude = buffer.readInt32BE(cursor) / 10_000_000;
    cursor += 4;
    const latitude = buffer.readInt32BE(cursor) / 10_000_000;
    cursor += 4;
    const altitude = buffer.readInt16BE(cursor);
    cursor += 2;
    const heading = buffer.readUInt16BE(cursor);
    cursor += 2;
    cursor += 1;
    const speedKmh = buffer.readUInt16BE(cursor);
    cursor += 2;
    cursor = skipTeltonikaIoElements(buffer, cursor, codecId, dataEnd);
    if (!session.imei) return null;
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
  assertReadable(buffer, cursor, 1);
  if (buffer[cursor] !== recordsCount || cursor + 1 !== dataEnd) return null;
  return { messages, acks: [Buffer.from([0, 0, 0, recordsCount])] };
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
  return [...buffer].map((byte) => `${byte >> 4}${byte & 0x0f}`).join("");
}

function parseGt06Date(buffer, offset) {
  assertReadable(buffer, offset, 6);
  const year = 2000 + buffer[offset];
  const month = buffer[offset + 1] - 1;
  const day = buffer[offset + 2];
  const hour = buffer[offset + 3];
  const minute = buffer[offset + 4];
  const second = buffer[offset + 5];
  const value = new Date(Date.UTC(year, month, day, hour, minute, second));
  if (Number.isNaN(value.getTime())) throw new Error("GPS_INVALID_TRACKER_TIME");
  return value.toISOString();
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
  const receivedCrc = buffer.readUInt16BE(buffer.length - 4);
  const calculatedCrc = crc16Gt06(buffer.subarray(2, buffer.length - 4));
  if (receivedCrc !== calculatedCrc) return null;
  const protocol = buffer[3];
  const serialOffset = buffer.length - 6;
  const serialNumber = buffer.readUInt16BE(serialOffset);
  const ack = buildGt06Ack(protocol, serialNumber);
  if (protocol === 0x01) {
    assertReadable(buffer, 4, 8);
    const imei = decodeBcd(buffer.subarray(4, 12)).replace(/^0/, "");
    if (!/^\d{14,17}$/.test(imei)) return null;
    bindSessionImei(session, imei);
    return { messages: [], acks: [ack] };
  }
  if (protocol === 0x13) return { messages: [], acks: [ack] };
  if (protocol !== 0x12 && protocol !== 0x16) return { messages: [], acks: [] };
  if (!session.imei) return null;
  assertReadable(buffer, 4, 18);
  const gpsInfo = buffer[10];
  const rawLatitude = buffer.readUInt32BE(11);
  const rawLongitude = buffer.readUInt32BE(15);
  const courseStatus = buffer.readUInt16BE(20);
  const latitude = (courseStatus & 0x0400 ? 1 : -1) * (rawLatitude / 1_800_000);
  const longitude = (courseStatus & 0x0800 ? -1 : 1) * (rawLongitude / 1_800_000);
  return {
    messages: [{
      protocol: "concox",
      imei: session.imei,
      latitude,
      longitude,
      speedKmh: buffer[19],
      heading: courseStatus & 0x03ff,
      trackerTime: parseGt06Date(buffer, 4),
      satellites: gpsInfo & 0x0f,
      rawPayload: buffer.toString("hex"),
    }],
    acks: [ack],
  };
}

function parseBinaryFrame(session, buffer) {
  const teltonikaImei = parseTeltonikaImei(buffer);
  if (teltonikaImei) {
    bindSessionImei(session, teltonikaImei);
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
      const dataLength = buffer.readUInt32BE(4);
      const totalLength = 8 + dataLength + 4;
      if (totalLength > MAX_BINARY_FRAME_BYTES) throw new Error("GPS_FRAME_TOO_LARGE");
      return totalLength;
    }
    const imeiLength = buffer.readUInt16BE(0);
    if (imeiLength >= 14 && imeiLength <= 17) return TELTONIKA_IMEI_LENGTH_BYTES + imeiLength;
  }
  if (buffer[0] === GT06_START) {
    if (buffer.length < 2) return undefined;
    if (buffer[1] !== GT06_START) return null;
    if (buffer.length < 3) return undefined;
    const totalLength = buffer[2] + 5;
    if (totalLength > MAX_BINARY_FRAME_BYTES) throw new Error("GPS_FRAME_TOO_LARGE");
    return totalLength;
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

export function parseTcpChunk(session, chunk, options = {}) {
  const nextChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  if (session.binaryBuffer.length + nextChunk.length > MAX_SESSION_BUFFER_BYTES) {
    throw new Error("GPS_SESSION_BUFFER_TOO_LARGE");
  }
  session.binaryBuffer = Buffer.concat([session.binaryBuffer, nextChunk]);
  const messages = [];
  const acks = [];
  while (session.binaryBuffer.length > 0) {
    const expectedLength = getExpectedBinaryFrameLength(session.binaryBuffer);
    if (expectedLength === undefined) break;
    if (expectedLength === null) {
      if (options.allowLegacyTextProtocols === true) {
        const parsedText = parseTextPayload(session.binaryBuffer);
        for (const message of parsedText) bindSessionImei(session, message.imei);
        messages.push(...parsedText);
      }
      session.binaryBuffer = Buffer.alloc(0);
      break;
    }
    if (session.binaryBuffer.length < expectedLength) break;
    const frame = session.binaryBuffer.subarray(0, expectedLength);
    session.binaryBuffer = session.binaryBuffer.subarray(expectedLength);
    const parsedBinary = parseBinaryFrame(session, frame);
    if (!parsedBinary) continue;
    messages.push(...parsedBinary.messages);
    acks.push(...parsedBinary.acks);
  }
  return { messages, acks };
}

function buildGatewayAuthHeaders(body, gatewayId, gatewayKey) {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("hex");
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", gatewayKey)
    .update(`${gatewayId}.${timestamp}.${nonce}.${payloadHash}`)
    .digest("hex");
  return {
    "x-gps-gateway-id": gatewayId,
    "x-gps-timestamp": timestamp,
    "x-gps-nonce": nonce,
    "x-gps-signature": signature,
  };
}

async function pushToIngest(payload, edgeIngestUrl, gatewayId, gatewayKey) {
  const body = JSON.stringify(payload);
  const response = await fetch(edgeIngestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildGatewayAuthHeaders(body, gatewayId, gatewayKey),
    },
    body,
  });
  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Ingestion HTTP ${response.status}: ${responseBody}`);
  }
}

export function createGpsTcpServer({
  edgeIngestUrl,
  gatewayId,
  gatewayKey,
  allowLegacyTextProtocols = false,
  socketIdleTimeoutMs = SOCKET_IDLE_TIMEOUT_MS,
}) {
  if (!edgeIngestUrl || !gatewayId || !gatewayKey) {
    throw new Error("GPS_INGEST_URL, GPS_GATEWAY_ID et GPS_GATEWAY_KEY sont requis.");
  }
  if (!edgeIngestUrl.startsWith("https://")) {
    throw new Error("GPS_INGEST_URL doit utiliser HTTPS.");
  }
  const activeImeis = new Map();
  return net.createServer((socket) => {
    const session = createGpsTcpSession();
    let registeredImei = null;
    socket.setTimeout(socketIdleTimeoutMs);
    socket.on("timeout", () => socket.destroy());
    socket.on("data", async (chunk) => {
      let parsed;
      try {
        parsed = parseTcpChunk(session, chunk, { allowLegacyTextProtocols });
      } catch (error) {
        console.warn("[gps-tcp-gateway] Trame rejetee:", error instanceof Error ? error.message : error);
        socket.destroy();
        return;
      }
      if (session.imei && registeredImei !== session.imei) {
        const existing = activeImeis.get(session.imei);
        if (existing && existing !== socket && !existing.destroyed) {
          console.warn(`[gps-tcp-gateway] Session IMEI concurrente rejetee: ${session.imei}`);
          socket.destroy();
          return;
        }
        if (registeredImei && activeImeis.get(registeredImei) === socket) activeImeis.delete(registeredImei);
        registeredImei = session.imei;
        activeImeis.set(session.imei, socket);
      }
      for (const ack of parsed.acks) socket.write(ack);
      for (const message of parsed.messages) {
        if (!message.imei || message.imei !== session.imei) {
          socket.destroy();
          return;
        }
        try {
          await pushToIngest(message, edgeIngestUrl, gatewayId, gatewayKey);
        } catch (error) {
          console.error("[gps-tcp-gateway] Erreur ingestion:", error);
        }
      }
    });
    const cleanup = () => {
      if (registeredImei && activeImeis.get(registeredImei) === socket) activeImeis.delete(registeredImei);
    };
    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });
}

export function startGpsTcpServer() {
  const port = Number(process.env.GPS_TCP_PORT ?? 5027);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("GPS_TCP_PORT invalide.");
  }
  const edgeIngestUrl = process.env.GPS_INGEST_URL ?? "";
  const gatewayId = process.env.GPS_GATEWAY_ID ?? "";
  const gatewayKey = process.env.GPS_GATEWAY_KEY ?? "";
  const allowLegacyTextProtocols = process.env.GPS_ALLOW_LEGACY_TEXT_PROTOCOLS === "true";
  const server = createGpsTcpServer({ edgeIngestUrl, gatewayId, gatewayKey, allowLegacyTextProtocols });
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
