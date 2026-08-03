import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function getIndexHtmlCsp(): string {
  const html = readFileSync("index.html", "utf8");
  return html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? "";
}

describe("index.html Content-Security-Policy", () => {
  it("allows local Supabase connections used by Playwright E2E", () => {
    const csp = getIndexHtmlCsp();

    expect(csp).toContain("connect-src");
    expect(csp).toContain("http://127.0.0.1:*");
    expect(csp).toContain("http://localhost:*");
  });
});
