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
  it("retourne status ok avec timestamp ISO", async () => {
    const handler = (await import("../../../api/health")).default;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    handler({ method: "GET" } as never, { status } as never);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        ts: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
  });
});
