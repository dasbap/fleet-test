import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("legacy demo request recovery", () => {
  it("reopens accepted requests that never provisioned an account", () => {
    const source = readFileSync("src/server/http/routes/demoRequest.ts", "utf8");

    expect(source).toContain('existingRequest.status === "accepted"');
    expect(source).toContain("!existingRequest.provisioned_user_id");
    expect(source).toContain('status: "pending"');
    expect(source).toContain("invitation_url: null");
    expect(source).toContain("admin_interacted_at: null");
  });
});
