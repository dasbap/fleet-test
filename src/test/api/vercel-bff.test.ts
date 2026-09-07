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

describe("native Vercel API routing", () => {
  it("laisse toutes les routes API au filesystem Vercel", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      rewrites?: Array<{ source?: string; destination?: string }>;
    };

    const apiRewrites = (config.rewrites ?? []).filter((route) =>
      route.source?.startsWith("/api/"),
    );

    expect(apiRewrites).toEqual([]);
    expect(readFileSync("api/[...path].ts", "utf8")).toContain("createVercelApiApp");
  });

  it("exclut /api du fallback SPA", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      rewrites?: Array<{ source?: string; destination?: string }>;
    };

    expect(config.rewrites).toContainEqual({
      source: "/((?!api/).*)",
      destination: "/index.html",
    });
  });
});

describe("billing subscriptions handler", () => {
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

describe("consolidated Hono route behavior", () => {
  it("garde les controles auth et payload des routes consolidees", async () => {
    const app = createVercelApiApp();

    const generateMagicLink = await app.fetch(
      new Request("https://fleet.test/api/admin/generate-magic-link", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(generateMagicLink.status).toBe(401);
    expect(await generateMagicLink.json()).toEqual({
      ok: false,
      error: "missing_auth_token",
    });

    const demoMagicLink = await app.fetch(
      new Request("https://fleet.test/api/demo/magic-link", {
        method: "POST",
        body: JSON.stringify({ action: "validate", token: "not-a-uuid" }),
      }),
    );
    expect(demoMagicLink.status).toBe(404);
    expect(await demoMagicLink.json()).toEqual({
      ok: false,
      error: "token_not_found",
    });

    const clearPasswordMarker = await app.fetch(
      new Request("https://fleet.test/api/auth/clear-password-marker", {
        method: "POST",
        body: JSON.stringify({ password: "new-password-123" }),
      }),
    );
    expect(clearPasswordMarker.status).toBe(401);
    expect(await clearPasswordMarker.json()).toEqual({
      ok: false,
      error: "missing_auth_token",
    });
  });
});

describe("Vercel Hobby function budget", () => {
  it("ne declare pas plus de 12 fonctions serverless", () => {
    const functionFiles = globSync("api/**/*.ts", {
      ignore: ["api/_lib/**/*.ts"],
      nodir: true,
    }).sort();

    expect(functionFiles.length).toBeLessThanOrEqual(12);
  });
});

describe("direct Vercel admin routes", () => {
  it("garde generate-magic-link en fonction dediee avec timeout borne", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      functions?: Record<string, { maxDuration?: number }>;
      rewrites?: Array<{ source?: string; destination?: string }>;
    };
    const directHandler = readFileSync("api/admin/generate-magic-link.ts", "utf8");

    expect(directHandler).not.toContain("createServerApp");
    expect(directHandler).toContain("fetchWithTimeout");
    expect(directHandler).toContain("req.body");
    expect(directHandler).toContain("is_platform_admin");
    expect(directHandler).toContain("demo_create_magic_link");
    expect(config.functions?.["api/admin/generate-magic-link.ts"]?.maxDuration).toBe(15);
    expect(config.rewrites ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "/api/admin/generate-magic-link" }),
      ]),
    );
  });

  it("garde create-prospect direct pour son fallback ADMIN_SECRET specifique", () => {
    const createProspect = readFileSync("api/admin/create-prospect.ts", "utf8");

    expect(createProspect).toContain("applyCors");
    expect(createProspect).toContain("requirePlatformAdmin");
    expect(createProspect).not.toContain('Access-Control-Allow-Origin", process.env.VITE_APP_URL ?? "*"');
  });
});
