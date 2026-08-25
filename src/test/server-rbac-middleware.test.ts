/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

describe("BFF RBAC middleware", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("appelle rbac_check_permission avec le JWT utilisateur et le parametre SQL p_action", async () => {
    const serviceRpc = vi.fn();
    const userRpc = vi.fn().mockResolvedValue({
      data: { allowed: true, role: "manager" },
      error: null,
    });

    vi.doMock("@/server/infra/supabaseServiceClient", () => ({
      createSupabaseServiceClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        rpc: serviceRpc,
      }),
    }));

    vi.doMock("@/server/infra/supabaseUserClient", () => ({
      createSupabaseUserClient: (token: string) => {
        expect(token).toBe("user-token");
        return { rpc: userRpc };
      },
    }));

    const { requirePermission } = await import(
      "@/server/http/middleware/rbacMiddleware"
    );
    const app = new Hono();
    app.get(
      "/fleet/:fleetId",
      requirePermission("member.view", (c) => c.req.param("fleetId")),
      (c) => c.json({ ok: true }),
    );

    const res = await app.request(
      "/fleet/00000000-0000-4000-8000-000000000001",
      {
        headers: { Authorization: "Bearer user-token" },
      },
    );

    expect(res.status).toBe(200);
    expect(userRpc).toHaveBeenCalledWith("rbac_check_permission", {
      p_action: "member.view",
      p_fleet_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(serviceRpc).not.toHaveBeenCalledWith(
      "rbac_check_permission",
      expect.anything(),
    );
  });

  it("identifie les admins plateforme via admin_profiles.user_id et internal_role", async () => {
    const eqCalls: Array<[string, unknown]> = [];

    const makeQuery = (table: string) => ({
      select: () => {
        const query = {
          eq(column: string, value: unknown) {
            eqCalls.push([`${table}.${column}`, value]);
            return query;
          },
          maybeSingle: vi.fn().mockResolvedValue({
            data:
              table === "admin_profiles"
                ? { id: "profile-1", is_active: true, internal_role: "admin" }
                : null,
            error: null,
          }),
        };
        return query;
      },
    });

    vi.doMock("@/server/infra/supabaseServiceClient", () => ({
      createSupabaseServiceClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-user-1" } },
            error: null,
          }),
        },
        from: (table: string) => makeQuery(table),
      }),
    }));

    vi.doMock("@/server/infra/supabaseUserClient", () => ({
      createSupabaseUserClient: () => ({ rpc: vi.fn() }),
    }));

    const { requireAdmin } = await import(
      "@/server/http/middleware/rbacMiddleware"
    );
    const app = new Hono();
    app.get("/admin", requireAdmin(), (c) => c.json({ ok: true }));

    const res = await app.request("/admin", {
      headers: { Authorization: "Bearer user-token" },
    });

    expect(res.status).toBe(200);
    expect(eqCalls).toContainEqual(["admin_profiles.user_id", "admin-user-1"]);
    expect(eqCalls).not.toContainEqual(["admin_profiles.id", "admin-user-1"]);
  });

  it("refuse un profil commercial actif comme admin plateforme", async () => {
    const makeQuery = (table: string) => ({
      select: () => {
        const query = {
          eq() {
            return query;
          },
          maybeSingle: vi.fn().mockResolvedValue({
            data:
              table === "admin_profiles"
                ? { id: "profile-2", is_active: true, internal_role: "commercial" }
                : null,
            error: null,
          }),
        };
        return query;
      },
    });

    vi.doMock("@/server/infra/supabaseServiceClient", () => ({
      createSupabaseServiceClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "commercial-user-1" } },
            error: null,
          }),
        },
        from: (table: string) => makeQuery(table),
      }),
    }));

    vi.doMock("@/server/infra/supabaseUserClient", () => ({
      createSupabaseUserClient: () => ({ rpc: vi.fn() }),
    }));

    const { requireAdmin } = await import(
      "@/server/http/middleware/rbacMiddleware"
    );
    const app = new Hono();
    app.get("/admin", requireAdmin(), (c) => c.json({ ok: true }));

    const res = await app.request("/admin", {
      headers: { Authorization: "Bearer user-token" },
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ code: "NOT_PLATFORM_ADMIN" });
  });
});
