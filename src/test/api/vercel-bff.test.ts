import { describe, it, expect, vi } from "vitest";
import { extractBearerToken } from "../../../api/_lib/vercel-api";

describe("extractBearerToken", () => {
  it("extrait un token Bearer valide", () => {
    const token = extractBearerToken({
      headers: { authorization: "Bearer abc.def.ghi" },
    } as Parameters<typeof extractBearerToken>[0]);

    expect(token).toBe("abc.def.ghi");
  });

  it("retourne null si header absent ou invalide", () => {
    expect(extractBearerToken({ headers: {} } as Parameters<typeof extractBearerToken>[0])).toBeNull();
    expect(
      extractBearerToken({ headers: { authorization: "Basic xyz" } } as Parameters<typeof extractBearerToken>[0]),
    ).toBeNull();
    expect(
      extractBearerToken({ headers: { authorization: "Bearer   " } } as Parameters<typeof extractBearerToken>[0]),
    ).toBeNull();
  });
});

describe("health handler", () => {
  it("retourne l'etat ok du BFF Vercel", async () => {
    const handler = (await import("../../../api/health")).default;
    const chunks: Buffer[] = [];
    const writeHead = vi.fn();
    const write = vi.fn((chunk: Uint8Array | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    });
    const end = vi.fn((chunk?: Uint8Array | string) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
    });

    await handler(
      {
        method: "GET",
        url: "/api/health",
        headers: { host: "fleet.test" },
        rawHeaders: ["host", "fleet.test"],
        socket: { encrypted: true },
        on: vi.fn(),
        errored: null,
      } as never,
      {
        headersSent: false,
        writableFinished: false,
        writeHead,
        write,
        end,
        on: vi.fn(),
      } as never,
    );

    expect(writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        "content-type": expect.stringContaining("application/json"),
      }),
    );
    expect(end).toHaveBeenCalled();
    expect(JSON.parse(Buffer.concat(chunks).toString("utf8"))).toEqual(
      expect.objectContaining({
        ok: true,
        service: "smart-fleet-bff",
        backendUrl: expect.stringMatching(/^https?:\/\//),
      }),
    );
  });
});
