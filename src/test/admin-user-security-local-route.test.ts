import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin user security local BFF route", () => {
  const appSource = readFileSync("src/server/http/app.ts", "utf8");
  const routeSource = readFileSync("src/server/http/routes/adminUserSecurity.ts", "utf8");

  it("enregistre la route user-security dans le BFF local", () => {
    expect(appSource).toContain("registerAdminUserSecurityRoutes");
    expect(appSource).toContain("registerAdminUserSecurityRoutes(app)");
    expect(routeSource).toContain('app.get("/api/admin/user-security"');
    expect(routeSource).toContain('app.post("/api/admin/user-security"');
  });

  it("garde les operations protegees par la session admin", () => {
    expect(routeSource).toContain("getBearerToken");
    expect(routeSource).toContain('client.rpc("is_platform_admin")');
    expect(routeSource).toContain('client.rpc("is_platform_super_admin")');
    expect(routeSource).toContain("createSupabaseServiceClient");
  });
});
