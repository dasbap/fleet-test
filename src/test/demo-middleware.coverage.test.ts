import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({ createClient: vi.fn() }));
const guardMock = vi.hoisted(() => ({ blocked: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient: supabaseMock.createClient }));
vi.mock("@/lib/demo/demoGuard", () => ({ isDemoBffRouteBlocked: guardMock.blocked }));

import { checkDemoAction, demoMiddleware } from "@/server/http/middleware/demoMiddleware";

const makeContext = (options: {
  authorization?: string;
  path?: string;
  method?: string;
  url?: string;
} = {}) => {
  const store = new Map<string, unknown>();
  const c = {
    req: {
      header: vi.fn((name: string) => (name === "Authorization" ? options.authorization : undefined)),
      path: options.path ?? "/api/resource",
      method: options.method ?? "POST",
      url: options.url ?? "https://app.example/api/resource",
    },
    json: vi.fn((body: unknown, status: number) => new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })),
    set: vi.fn((key: string, value: unknown) => store.set(key, value)),
    get: vi.fn((key: string) => store.get(key)),
    store,
  };
  return c;
};

const makeChain = (result: unknown = { data: null }) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.gt = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.single = vi.fn(async () => result);
  chain.insert = vi.fn(async () => ({ error: null }));
  chain.update = vi.fn(() => chain);
  return chain;
};

const makeAdmin = (options: {
  user?: unknown;
  authError?: unknown;
  profile?: unknown;
  session?: unknown;
  rpcData?: unknown;
} = {}) => {
  const profileChain = makeChain({ data: options.profile === undefined ? null : options.profile });
  const sessionChain = makeChain({ data: options.session === undefined ? null : options.session });
  const auditChain = makeChain();
  const heartbeatChain = makeChain();
  const admin = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.user === undefined ? { id: "user-1" } : options.user },
        error: options.authError ?? null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "demo_profiles") return profileChain;
      if (table === "demo_sessions") {
        if ((admin.from as ReturnType<typeof vi.fn>).mock.calls.filter((call) => call[0] === "demo_sessions").length > 1) {
          return heartbeatChain;
        }
        return sessionChain;
      }
      if (table === "demo_audit_logs") return auditChain;
      return makeChain();
    }),
    rpc: vi.fn(async () => ({ data: options.rpcData ?? null })),
  };
  return { admin, profileChain, sessionChain, auditChain, heartbeatChain };
};

describe("demoMiddleware", () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    guardMock.blocked.mockReturnValue(false);
  });

  afterEach(() => {
    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("laisse passer sans Bearer", async () => {
    const c = makeContext();
    const next = vi.fn();
    await demoMiddleware(c as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(supabaseMock.createClient).not.toHaveBeenCalled();
  });

  it("laisse passer un header non Bearer", async () => {
    const c = makeContext({ authorization: "Basic abc" });
    const next = vi.fn();
    await demoMiddleware(c as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    [undefined, "service-role"],
    ["https://supabase.example", undefined],
  ])("retourne 500 si la configuration serveur manque", async (url, key) => {
    if (url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = url;
    if (key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = key;
    const c = makeContext({ authorization: "Bearer token" });
    const response = await demoMiddleware(c as never, vi.fn());
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(500);
    await expect((response as Response).json()).resolves.toEqual({ error: "Configuration serveur incorrecte" });
  });

  it("crée le client admin sans persister la session", async () => {
    const { admin } = makeAdmin({ user: null });
    supabaseMock.createClient.mockReturnValue(admin);
    const c = makeContext({ authorization: "Bearer token" });
    await demoMiddleware(c as never, vi.fn());
    expect(supabaseMock.createClient).toHaveBeenCalledWith(
      "https://supabase.example",
      "service-role",
      { auth: { persistSession: false } },
    );
  });

  it.each([
    [{ user: null }, "sans utilisateur"],
    [{ authError: new Error("bad token") }, "avec erreur auth"],
  ])("laisse l'auth middleware gérer un token invalide", async (options) => {
    const { admin } = makeAdmin(options);
    supabaseMock.createClient.mockReturnValue(admin);
    const next = vi.fn();
    await demoMiddleware(makeContext({ authorization: "Bearer token" }) as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("laisse passer un utilisateur réel sans profil démo", async () => {
    const { admin } = makeAdmin({ profile: null });
    supabaseMock.createClient.mockReturnValue(admin);
    const next = vi.fn();
    await demoMiddleware(makeContext({ authorization: "Bearer token" }) as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("refuse une session démo expirée et écrit l'audit", async () => {
    const profile = { user_id: "user-1", demo_role: "manager", fleet_id: "fleet-1", is_active: true };
    const { admin, auditChain } = makeAdmin({ profile, session: null });
    supabaseMock.createClient.mockReturnValue(admin);
    const c = makeContext({ authorization: "Bearer token", path: "/api/billing", method: "GET" });
    const response = await demoMiddleware(c as never, vi.fn());
    expect((response as Response).status).toBe(401);
    expect(auditChain.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      session_id: null,
      action: "blocked_expired_session",
      resource: "/api/billing",
      status: "expired",
      metadata: { path: "/api/billing", method: "GET" },
    });
  });

  it("bloque une route interdite et audite le rôle", async () => {
    const profile = { user_id: "user-1", demo_role: "driver", fleet_id: "fleet-1", is_active: true };
    const session = { id: "session-1", user_id: "user-1", expires_at: "2099-01-01T00:00:00Z", is_active: true };
    const { admin, auditChain } = makeAdmin({ profile, session });
    supabaseMock.createClient.mockReturnValue(admin);
    guardMock.blocked.mockReturnValue(true);
    const c = makeContext({
      authorization: "Bearer token",
      path: "/api/admin/users",
      method: "DELETE",
      url: "https://app.example/api/admin/users?x=1",
    });
    const response = await demoMiddleware(c as never, vi.fn());
    expect((response as Response).status).toBe(403);
    await expect((response as Response).json()).resolves.toEqual({
      error: "Action non disponible en mode démo",
      code: "DEMO_ROUTE_BLOCKED",
      path: "/api/admin/users",
    });
    expect(auditChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      session_id: "session-1",
      action: "blocked_route",
      resource: "/api/admin/users",
      status: "blocked",
      metadata: { path: "/api/admin/users", method: "DELETE", role: "driver" },
    }));
  });

  it("met à jour le heartbeat, attache le contexte et continue", async () => {
    const profile = { user_id: "user-1", demo_role: "manager", fleet_id: "fleet-1", is_active: true };
    const session = { id: "session-1", user_id: "user-1", expires_at: "2099-01-01T00:00:00Z", is_active: true };
    const { admin, heartbeatChain } = makeAdmin({ profile, session });
    supabaseMock.createClient.mockReturnValue(admin);
    const c = makeContext({ authorization: "Bearer token" });
    const next = vi.fn();
    await demoMiddleware(c as never, next);
    expect(heartbeatChain.update).toHaveBeenCalledWith({ last_seen_at: expect.any(String) });
    expect(heartbeatChain.eq).toHaveBeenCalledWith("id", "session-1");
    expect(c.set).toHaveBeenCalledWith("demoProfile", profile);
    expect(c.set).toHaveBeenCalledWith("demoSession", session);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("checkDemoAction", () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  afterEach(() => {
    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("autorise toujours un utilisateur non démo", async () => {
    const c = makeContext();
    await expect(checkDemoAction(c as never, "export_data")).resolves.toBe(true);
    expect(supabaseMock.createClient).not.toHaveBeenCalled();
  });

  it("refuse si le client admin ne peut pas être construit", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const c = makeContext();
    c.store.set("demoProfile", { user_id: "user-1" });
    await expect(checkDemoAction(c as never, "view_billing")).resolves.toBe(false);
  });

  it.each([
    [{ allowed: true }, true],
    [{ allowed: false }, false],
    [null, false],
  ])("retourne la décision RPC %#", async (rpcData, expected) => {
    const { admin } = makeAdmin({ rpcData });
    supabaseMock.createClient.mockReturnValue(admin);
    const c = makeContext();
    c.store.set("demoProfile", { user_id: "user-1" });
    await expect(checkDemoAction(c as never, "create_vehicle")).resolves.toBe(expected);
    expect(admin.rpc).toHaveBeenCalledWith("demo_check_allowed", { p_action: "create_vehicle" });
  });
});
