import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "supabase/functions/generate-scheduled-report/index.ts",
  "utf8",
);

describe("scheduled report function security", () => {
  it("requires the service role bearer token before processing reports", () => {
    expect(source).toContain('req.headers.get("authorization")');
    expect(source).toContain("timingSafeEqual(token, SUPABASE_SERVICE_ROLE_KEY)");
    expect(source).not.toContain("token === SUPABASE_SERVICE_ROLE_KEY");
    expect(source).toContain('{ error: "unauthorized" }, 401');
  });

  it("does not expose Supabase error messages to callers", () => {
    expect(source).not.toContain('JSON.stringify({ error: fetchErr.message })');
    expect(source).toContain("scheduled_reports_fetch_failed");
  });
});
