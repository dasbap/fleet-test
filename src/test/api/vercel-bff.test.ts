import { readFileSync } from "node:fs";
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

describe("billing subscriptions handler", () => {
  it("dispose d'une fonction Vercel dediee pour eviter le fallback SPA HTML", () => {
    const source = readFileSync("api/billing/subscriptions.ts", "utf8");

    expect(source).toContain('from "@hono/node-server/vercel"');
    expect(source).toContain("createVercelApiApp");
  });

  it("atteint le BFF Vercel et renvoie du JSON quand le Bearer manque", async () => {
    const app = createVercelApiApp();
    const response = await app.fetch(
      new Request(
        "https://fleet.test/api/billing/subscriptions?org_id=00000000-0000-4000-8000-000000000001&fleet_id=00000000-0000-4000-8000-000000000002",
        { method: "GET" },
      ),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      error: "Authorization Bearer requis",
    });
  });
});

describe("billing Notch Pay handler", () => {
  it("dispose d'une fonction Vercel dediee pour accepter POST sans fallback 405", () => {
    const source = readFileSync("api/billing/notch/initiate.ts", "utf8");

    expect(source).toContain('from "@hono/node-server/vercel"');
    expect(source).toContain("createVercelApiApp");
  });
});
