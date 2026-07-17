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
});
