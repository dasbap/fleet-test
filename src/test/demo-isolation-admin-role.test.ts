/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

describe("demo isolation internal role boundary", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("ne traite pas un profil commercial comme admin plateforme", async () => {
    const makeQuery = (table: string) => ({
      select: () => {
        const query = {
          eq() {
            return query;
          },
          maybeSingle: vi.fn().mockResolvedValue({
            data:
              table === "admin_profiles"
                ? { user_id: "commercial-1", internal_role: "commercial" }
                : table === "demo_profiles"
                  ? { user_id: "commercial-1", account_type: "prospect", is_active: true }
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
            data: { user: { id: "commercial-1" } },
            error: null,
          }),
        },
        from: (table: string) => makeQuery(table),
      }),
    }));

    const { requireRealUser } = await import(
      "@/server/http/middleware/demoIsolationMiddleware"
    );
    const app = new Hono();
    app.get("/real-only", requireRealUser(), (c) => c.json({ ok: true }));

    const res = await app.request("/real-only", {
      headers: { Authorization: "Bearer user-token" },
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      code: "DEMO_ACCOUNT_BLOCKED",
      kind: "prospect",
    });
  });
});
