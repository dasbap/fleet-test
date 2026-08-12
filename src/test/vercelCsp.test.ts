import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function getCsp(): string {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    headers?: Array<{ headers?: Array<{ key: string; value: string }> }>;
  };

  const header = config.headers
    ?.flatMap((entry) => entry.headers ?? [])
    .find((entry) => entry.key.toLowerCase() === "content-security-policy");

  return header?.value ?? "";
}

describe("vercel Content-Security-Policy", () => {
  it("allows the marketing origin used by Workbox navigation precache", () => {
    expect(getCsp()).toContain("connect-src");
    expect(getCsp()).toContain("https://marketing.e-samba.com");
  });

  it("allows Vite module workers emitted as same-origin or data/blob URLs", () => {
    expect(getCsp()).toContain("worker-src 'self' blob: data:");
  });

  it("allows the PostHog EU ingestion and asset endpoints used by the browser SDK", () => {
    const csp = getCsp();

    expect(csp).toContain("script-src");
    expect(csp).toContain("https://eu-assets.i.posthog.com");
    expect(csp).toContain("connect-src");
    expect(csp).toContain("https://eu.i.posthog.com");
  });

  it("allows the configured public PMTiles archive host", () => {
    expect(getCsp()).toContain(
      "https://pub-8c4a7313a75946149688b380cba66fba.r2.dev"
    );
  });
});
