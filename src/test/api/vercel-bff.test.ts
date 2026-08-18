import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { globSync } from "glob";
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
  it("route la facturation vers la fonction catch-all pour rester sous la limite Hobby", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      rewrites?: Array<{ source?: string; destination?: string }>;
    };

    expect(config.rewrites).toEqual(
      expect.arrayContaining([
        {
          source: "/api/billing/subscriptions",
          destination: "/api/[...path]",
        },
      ]),
    );
    expect(readFileSync("api/[...path].ts", "utf8")).toContain("createVercelApiApp");
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
  it("route Notch Pay vers la fonction catch-all pour accepter POST sans fallback 405", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      rewrites?: Array<{ source?: string; destination?: string }>;
    };

    expect(config.rewrites).toEqual(
      expect.arrayContaining([
        {
          source: "/api/billing/notch/initiate",
          destination: "/api/[...path]",
        },
      ]),
    );
  });
});

describe("Vercel Hobby function budget", () => {
  it("ne declare pas plus de 12 fonctions serverless", () => {
    const functionFiles = globSync("api/**/*.ts", {
      ignore: ["api/_lib/**/*.ts"],
      nodir: true,
    }).sort();

    expect(functionFiles).toHaveLength(12);
  });
});
