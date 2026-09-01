import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("api/admin/create-user.ts", "utf8");

describe("admin user provisioning rate limit", () => {
  it("fails closed through the persistent service-role rate limiter", () => {
    expect(source).toMatch(/admin\.rpc\(\s*"demo_check_rate_limit"/);
    expect(source).toContain('p_key: `admin_create_user:${provisionerKey}`');
    expect(source).toContain("rate_limit_check_failed");
    expect(source).toContain("rate_limit_exceeded");
    expect(source).toContain("res.status(429)");
  });
});
