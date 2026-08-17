import { describe, expect, it } from "vitest";

import {
  createGpsTcpServer,
  createGpsTcpSession,
  parseTcpChunk,
} from "../../scripts/gps-tcp-gateway.mjs";

function hex(value: string): Buffer {
  return Buffer.from(value.replace(/\s+/g, ""), "hex");
}

describe("GPS TCP gateway binary protocols", () => {
  it("refuse de relayer l'ingestion GPS vers une URL non HTTPS", () => {
    expect(() =>
      createGpsTcpServer({
        edgeIngestUrl: "http://example.test/api/gps/ingest",
        edgeIngestKey: "secret",
      }),
    ).toThrow("GPS_INGEST_URL doit utiliser HTTPS.");
  });

  it("accepte l'IMEI Teltonika et repond 01", () => {
    const session = createGpsTcpSession();

    const result = parseTcpChunk(session, hex("000F333536333037303432343431303133"));

    expect(session.imei).toBe("356307042441013");
    expect(result.acks.map((ack: Buffer) => ack.toString("hex"))).toEqual(["01"]);
    expect(result.messages).toEqual([]);
  });

  it("decode un paquet AVL Teltonika Codec8E et acquitte le nombre d'enregistrements", () => {
    const session = createGpsTcpSession();
    session.imei = "356307042441013";

    const result = parseTcpChunk(
      session,
      hex(
        "000000000000004A8E010000016B412CEE000100000000000000000000000000000000010005000100010100010011001D00010010015E2C880002000B000000003544C87A000E000000001DD7E06A00000100002994",
      ),
    );

    expect(result.acks.map((ack: Buffer) => ack.toString("hex"))).toEqual(["00000001"]);
    expect(result.messages).toMatchObject([
      {
        protocol: "teltonika",
        imei: "356307042441013",
        latitude: 0,
        longitude: 0,
        speedKmh: 0,
        heading: 0,
        trackerTime: "2019-06-10T11:36:32.000Z",
      },
    ]);
  });

  it("reassemble les trames binaires fragmentees par TCP", () => {
    const session = createGpsTcpSession();
    const packet = hex("000F333536333037303432343431303133");

    const first = parseTcpChunk(session, packet.subarray(0, 5));
    expect(first).toEqual({ messages: [], acks: [] });
    expect(session.imei).toBeNull();

    const second = parseTcpChunk(session, packet.subarray(5));
    expect(second.acks.map((ack: Buffer) => ack.toString("hex"))).toEqual(["01"]);
    expect(session.imei).toBe("356307042441013");
  });

  it("decode le login et la position Concox GT06 avec les ACK attendus", () => {
    const session = createGpsTcpSession();

    const login = parseTcpChunk(session, hex("78780D01012345678901234500018CDD0D0A"));
    const position = parseTcpChunk(
      session,
      hex("78781F120B081D112E10CF027AC7EB0C46584900148F01CC00287D001FB8000380810D0A"),
    );

    expect(session.imei).toBe("123456789012345");
    expect(login.acks.map((ack: Buffer) => ack.toString("hex"))).toEqual(["787805010001d9dc0d0a"]);
    expect(position.acks.map((ack: Buffer) => ack.toString("hex"))).toEqual(["787805120003903f0d0a"]);
    expect(position.messages).toHaveLength(1);
    expect(position.messages[0]).toMatchObject({
      protocol: "concox",
      imei: "123456789012345",
      speedKmh: 0,
      heading: 143,
      trackerTime: "2011-08-29T17:46:16.000Z",
    });
    expect(position.messages[0].latitude).toBeCloseTo(23.111668, 6);
    expect(position.messages[0].longitude).toBeCloseTo(114.409285, 6);
  });
});
