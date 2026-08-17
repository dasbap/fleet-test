/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import { applyCors } from "../../api/_lib/vercel-api";

describe("Vercel API CORS", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("ne reflete pas une origine inconnue", () => {
    process.env.VITE_APP_URL = "https://www.e-samba.com";
    const headers = new Map<string, string>();
    const res = {
      setHeader: (name: string, value: string) => {
        headers.set(name, value);
      },
    };

    applyCors(res as never, "https://evil.example");

    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "https://www.e-samba.com",
    );
    expect(headers.get("Vary")).toBe("Origin");
  });

  it("accepte localhost pour le developpement", () => {
    const headers = new Map<string, string>();
    const res = {
      setHeader: (name: string, value: string) => {
        headers.set(name, value);
      },
    };

    applyCors(res as never, "http://localhost:8080");

    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:8080",
    );
  });
});
