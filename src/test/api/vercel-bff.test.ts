import { describe, it, expect } from "vitest";
import { extractBearerToken } from "../../../api/_lib/vercel-api";
import { createVercelApiApp } from "../../server/http/vercel";

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
    const app = createVercelApiApp();
    const response = await app.fetch(
      new Request("https://fleet.test/api/health", { method: "GET" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(
      expect.objectContaining({
        ok: true,
        service: "smart-fleet-bff",
        backendUrl: expect.stringMatching(/^https?:\/\//),
      }),
    );
  });
});
