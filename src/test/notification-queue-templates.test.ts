import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("process-notification-queue templates", () => {
  it("sait envoyer le template prospect_welcome mis en queue par la creation demo", () => {
    const worker = readFileSync("supabase/functions/process-notification-queue/index.ts", "utf8");

    expect(worker).toContain('row.template_id === "prospect_welcome"');
    expect(worker).toContain("escapeHtml");
  });
});
