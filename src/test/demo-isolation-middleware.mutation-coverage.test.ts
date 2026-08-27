import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const createSupabaseServiceClient = vi.fn();
vi.mock("@/server/infra/supabaseServiceClient", () => ({ createSupabaseServiceClient }));
vi.mock("@/server/http/auth", () => ({ getBearerToken: (value?: string) => value?.startsWith("Bearer ") ? value.slice(7) : null }));
vi.mock("@/lib/supabase-runtime-errors", () => ({ throwIfSupabaseInfrastructureError: vi.fn() }));

import {
  demoIsolationMiddleware,
  invalidateIsolationCache,
  requireDemoUser,
  requireRealUser,
  verifyFleetIsolation,
} from "@/server/http/middleware/demoIsolationMiddleware";

function query(result: any) {
  const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle: vi.fn().mockResolvedValue(result) };
  return chain;
}

function adminClient(state: { user?: any; authError?: any; adminRow?: any; adminError?: any; demoRow?: any; demoError?: any; fleetRow?: any; fleetError?: any }) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: state.user === undefined ? { id: "u1" } : state.user }, error: state.authError ?? null }) },
    from: vi.fn((table: string) => {
      if (table === "admin_profiles") return query({ data: state.adminRow ?? null, error: state.adminError ?? null });
      if (table === "demo_profiles") return query({ data: state.demoRow ?? null, error: state.demoError ?? null });
      if (table === "flottes") return query({ data: state.fleetRow ?? null, error: state.fleetError ?? null });
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

async function runMiddleware(middleware: any, auth = true) {
  const app = new Hono();
  app.use("*", middleware);
  app.get("/x", (c) => c.json({ ok: true, kind: c.get("isolationUserKind"), userId: c.get("isolationUserId") }));
  return app.request("/x", { headers: auth ? { Authorization: "Bearer token" } : {} });
}

describe("demo isolation middleware mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateIsolationCache("u1");
    invalidateIsolationCache("u2");
    invalidateIsolationCache("u3");
  });

  it("passes through without auth token", async () => {
    createSupabaseServiceClient.mockReturnValue(adminClient({}));
    const response = await runMiddleware(demoIsolationMiddleware(() => "fleet"), false);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("passes through invalid user token after auth lookup", async () => {
    createSupabaseServiceClient.mockReturnValue(adminClient({ user: null }));
    const response = await runMiddleware(demoIsolationMiddleware(() => "fleet"));
    expect(response.status).toBe(200);
  });

  it("lets platform admins bypass fleet isolation", async () => {
    createSupabaseServiceClient.mockReturnValue(adminClient({ adminRow: { user_id: "u1", internal_role: "super_admin" }, fleetRow: { is_demo: true } }));
    const response = await runMiddleware(demoIsolationMiddleware(() => "real-fleet"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, kind: "admin", userId: "u1" });
  });

  it("classifies admin internal_role admin too", async () => {
    createSupabaseServiceClient.mockReturnValue(adminClient({ adminRow: { user_id: "u1", internal_role: "admin" } }));
    const response = await runMiddleware(requireRealUser());
    expect(response.status).toBe(200);
    expect((await response.json()).kind).toBe("admin");
  });

  it("allows middleware when no fleet id or fleet cannot be resolved", async () => {
    createSupabaseServiceClient.mockReturnValue(adminClient({}));
    let response = await runMiddleware(demoIsolationMiddleware());
    expect(response.status).toBe(200);
    invalidateIsolationCache("u1");
    createSupabaseServiceClient.mockReturnValue(adminClient({ fleetRow: null }));
    response = await runMiddleware(demoIsolationMiddleware(() => "f"));
    expect(response.status).toBe(200);
  });

  it("blocks demo and prospect users from real fleets", async () => {
    for (const account_type of ["demo", "prospect"]) {
      invalidateIsolationCache("u1");
      createSupabaseServiceClient.mockReturnValue(adminClient({ demoRow: { user_id: "u1", account_type, is_active: true }, fleetRow: { is_demo: false } }));
      const response = await runMiddleware(demoIsolationMiddleware(() => "real"));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Accès à une flotte réelle interdit depuis un compte démo", code: "DEMO_ISOLATION_VIOLATION", fleet_id: "real" });
    }
  });

  it("blocks real users from demo fleets and allows matching isolation", async () => {
    createSupabaseServiceClient.mockReturnValue(adminClient({ fleetRow: { is_demo: true } }));
    let response = await runMiddleware(demoIsolationMiddleware(() => "demo"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Accès à une flotte démo interdit depuis un compte réel", code: "REAL_ISOLATION_VIOLATION", fleet_id: "demo" });
    invalidateIsolationCache("u1");
    createSupabaseServiceClient.mockReturnValue(adminClient({ demoRow: { user_id: "u1", account_type: "demo" }, fleetRow: { is_demo: true } }));
    response = await runMiddleware(demoIsolationMiddleware(() => "demo"));
    expect(response.status).toBe(200);
  });

  it("requireRealUser rejects unauthenticated demo and prospect accounts", async () => {
    let response = await runMiddleware(requireRealUser(), false);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentification requise", code: "UNAUTHENTICATED" });
    for (const account_type of ["demo", "prospect"]) {
      invalidateIsolationCache("u1");
      createSupabaseServiceClient.mockReturnValue(adminClient({ demoRow: { user_id: "u1", account_type } }));
      response = await runMiddleware(requireRealUser());
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual(expect.objectContaining({ code: "DEMO_ACCOUNT_BLOCKED", kind: account_type }));
    }
  });

  it("requireRealUser accepts real users", async () => {
    createSupabaseServiceClient.mockReturnValue(adminClient({}));
    const response = await runMiddleware(requireRealUser());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, kind: "real", userId: "u1" });
  });

  it("requireDemoUser accepts demo prospect admin and rejects real", async () => {
    for (const kind of ["demo", "prospect"] as const) {
      invalidateIsolationCache("u1");
      createSupabaseServiceClient.mockReturnValue(adminClient({ demoRow: { user_id: "u1", account_type: kind } }));
      const response = await runMiddleware(requireDemoUser());
      expect(response.status).toBe(200);
      expect((await response.json()).kind).toBe(kind);
    }
    invalidateIsolationCache("u1");
    createSupabaseServiceClient.mockReturnValue(adminClient({ adminRow: { user_id: "u1", internal_role: "admin" } }));
    expect((await runMiddleware(requireDemoUser())).status).toBe(200);
    invalidateIsolationCache("u1");
    createSupabaseServiceClient.mockReturnValue(adminClient({}));
    const real = await runMiddleware(requireDemoUser());
    expect(real.status).toBe(403);
    expect(await real.json()).toEqual({ error: "Route réservée aux comptes démo", code: "DEMO_ONLY" });
    const unauth = await runMiddleware(requireDemoUser(), false);
    expect(unauth.status).toBe(401);
  });

  it("verifyFleetIsolation uses context kind and returns precise violations", async () => {
    const app = new Hono();
    app.get("/demo-real", async (c) => {
      c.set("isolationUserKind", "demo");
      const result = await verifyFleetIsolation(c, "real");
      return result ?? c.json({ ok: true });
    });
    createSupabaseServiceClient.mockReturnValue(adminClient({ fleetRow: { is_demo: false } }));
    let response = await app.request("/demo-real");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Isolation démo violée : flotte réelle inaccessible", code: "DEMO_ISOLATION_VIOLATION" });

    const app2 = new Hono();
    app2.get("/real-demo", async (c) => {
      c.set("isolationUserKind", "real");
      const result = await verifyFleetIsolation(c, "demo");
      return result ?? c.json({ ok: true });
    });
    createSupabaseServiceClient.mockReturnValue(adminClient({ fleetRow: { is_demo: true } }));
    response = await app2.request("/real-demo");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Isolation démo violée : flotte démo inaccessible", code: "REAL_ISOLATION_VIOLATION" });
  });

  it("verifyFleetIsolation allows admin matching fleets and missing fleet records", async () => {
    const app = new Hono();
    app.get("/x", async (c) => {
      c.set("isolationUserKind", "admin");
      const result = await verifyFleetIsolation(c, "f");
      return result ?? c.json({ ok: true });
    });
    createSupabaseServiceClient.mockReturnValue(adminClient({ fleetRow: { is_demo: true } }));
    expect((await app.request("/x")).status).toBe(200);
  });
});
