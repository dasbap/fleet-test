import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cronSecretFiles = [
  "api/crons/expire-demo-accounts.ts",
  "supabase/functions/billing-lifecycle-cron/index.ts",
  "supabase/functions/expire-demo-accounts/index.ts",
  "supabase/functions/expire-prospect-accounts/index.ts",
  "supabase/functions/refresh-analytics/index.ts",
];

describe("cron secret security", () => {
  it("compares shared cron secrets with timing-safe helpers", () => {
    for (const file of cronSecretFiles) {
      const source = readFileSync(file, "utf8");

      expect(source, file).toMatch(/timingSafeEqual/);
      expect(source, file).not.toMatch(/\btoken\s*!==\s*CRON_SECRET\b/);
      expect(source, file).not.toMatch(/\bsecret\s*!==\s*CRON_SECRET\b/);
    }
  });
});
