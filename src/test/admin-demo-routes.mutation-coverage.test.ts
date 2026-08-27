import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const { createSupabaseServiceClient, createSupabaseUserClient } = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  createSupabaseUserClient: vi.fn(),
}));
vi.mock("@/server/infra/supabaseServiceClient", () => ({ createSupabaseServiceClient }));
vi.mock("@/server/infra/supabaseUserClient", () => ({ createSupabaseUserClient }));
vi.mock("@/server/env", () => ({ getAppUrl: () => "https://app.test", getSupabaseUrl: () => "https://supabase.test" }));
vi.mock("@/server/http/auth", () => ({ getBearerToken: (value?: string) => value?.startsWith("Bearer ") ? value.slice(7) : null }));
vi.mock("@/server/http/errorResponse", () => ({ jsonInternalServerError: (c: any, error: any) => c.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500) }));

import { registerAdminDemoRoutes, resolveAppUrlFromOrigin } from "@/server/http/routes/adminDemo";

function userClient(options?: { user?: any; authError?: any; isAdmin?: any; isSuperAdmin?: any }) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options?.user === undefined ? { id: "admin-1" } : options.user }, error: options?.authError ?? null }) },
    rpc: vi.fn((name: string) => Promise.resolve({ data: name === "is_platform_admin" ? (options?.isAdmin ?? true) : (options?.isSuperAdmin ?? false) })),
  };
}

function serviceClient(options?: { rpcData?: any; rpcError?: any; generatedLink?: any; generateError?: any; currentUsers?: any[]; currentErrors?: any[]; updateUser?: any; updateError?: any }) {
  const getUserById = vi.fn();
  for (const [i, data] of (options?.currentUsers ?? [{ user: { id: "u1", app_metadata: {}, updated_at: "2026-08-27T12:00:00Z" } }, { user: { id: "u1", app_metadata: { must_set_password: false }, updated_at: "2026-08-27T12:00:00Z" } }]).entries()) {
    getUserById.mockResolvedValueOnce({ data, error: options?.currentErrors?.[i] ?? null });
  }
  const rpcData = options && "rpcData" in options ? options.rpcData : { ok: true, token: "magic-token" };
  const generatedLink = options && "generatedLink" in options ? options.generatedLink : { properties: { action_link: "https://magic.test/link" } };
  const updateUser = options && "updateUser" in options ? options.updateUser : { user: { id: "u1" } };
  return {
    rpc: vi.fn().mockResolvedValue({ data: rpcData, error: options?.rpcError ?? null }),
    auth: { admin: {
      generateLink: vi.fn().mockResolvedValue({ data: generatedLink, error: options?.generateError ?? null }),
      getUserById,
      updateUserById: vi.fn().mockResolvedValue({ data: updateUser, error: options?.updateError ?? null }),
    } },
  };
}

function app() {
  const instance = new Hono();
  registerAdminDemoRoutes(instance);
  return instance;
}

async function request(path: string, body: any, options?: { auth?: boolean; origin?: string }) {
  return app().request(path, { method: "POST", headers: { ...(options?.auth === false ? {} : { Authorization: "Bearer token" }), ...(options?.origin ? { Origin: options.origin } : {}), "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
}

describe("admin demo routes mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon");
    delete process.env.ADMIN_SECRET;
    createSupabaseUserClient.mockReturnValue(userClient());
    createSupabaseServiceClient.mockReturnValue(serviceClient());
  });

  it("resolves only safe local development origins", () => {
    expect(resolveAppUrlFromOrigin("http://localhost:5173/")).toBe("http://localhost:5173");
    expect(resolveAppUrlFromOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(resolveAppUrlFromOrigin("https://localhost:5173")).toBe("https://app.test");
    expect(resolveAppUrlFromOrigin("http://user:pass@localhost:5173")).toBe("https://app.test");
    expect(resolveAppUrlFromOrigin("https://evil.test")).toBe("https://app.test");
    expect(resolveAppUrlFromOrigin("not a url")).toBe("https://app.test");
    expect(resolveAppUrlFromOrigin(null)).toBe("https://app.test");
    vi.stubEnv("NODE_ENV", "production");
    expect(resolveAppUrlFromOrigin("http://localhost:5173")).toBe("https://app.test");
  });

  it("requires authentication and Supabase auth config for generate route", async () => {
    let response = await request("/api/admin/generate-magic-link", {}, { auth: false });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "missing_auth_token" });
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    response = await request("/api/admin/generate-magic-link", {});
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "server_configuration_error" });
  });

  it("rejects invalid auth and non admins", async () => {
    createSupabaseUserClient.mockReturnValue(userClient({ user: null }));
    let response = await request("/api/admin/generate-magic-link", {});
    expect(response.status).toBe(401);
    createSupabaseUserClient.mockReturnValue(userClient({ authError: { message: "bad" } }));
    response = await request("/api/admin/generate-magic-link", {});
    expect(response.status).toBe(401);
    createSupabaseUserClient.mockReturnValue(userClient({ isAdmin: false }));
    response = await request("/api/admin/generate-magic-link", {});
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "forbidden_not_platform_admin" });
  });

  it("rejects invalid JSON and payload on generate route", async () => {
    let response = await request("/api/admin/generate-magic-link", "{");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_json" });
    for (const body of [{}, { user_id: "bad", email: "a@b.com" }, { user_id: "00000000-0000-4000-8000-000000000001", email: "bad" }, { user_id: "00000000-0000-4000-8000-000000000001", email: "a@b.com", label: "" }]) {
      response = await request("/api/admin/generate-magic-link", body);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("invalid_payload");
    }
  });

  it("creates magic link locally with normalized optional values", async () => {
    const admin = serviceClient({ rpcData: { ok: true, token: "tok-1" } });
    createSupabaseServiceClient.mockReturnValue(admin);
    const response = await request("/api/admin/generate-magic-link", { user_id: "00000000-0000-4000-8000-000000000001", email: "a@b.com", label: " Demo " }, { origin: "http://localhost:5173/" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, magic_url: "http://localhost:5173/demo/access?token=tok-1" });
    expect(admin.rpc).toHaveBeenCalledWith("demo_create_magic_link", { p_user_id: "00000000-0000-4000-8000-000000000001", p_fleet_id: null, p_email: "a@b.com", p_label: "Demo", p_expires_at: null, p_created_by: "admin-1" });
  });

  it("handles local magic link service failures", async () => {
    createSupabaseServiceClient.mockReturnValue(null);
    let response = await request("/api/admin/generate-magic-link", { user_id: "00000000-0000-4000-8000-000000000001", email: "a@b.com" });
    expect(response.status).toBe(503);
    for (const options of [{ rpcData: null }, { rpcData: { ok: false } }, { rpcData: { ok: true } }, { rpcError: { message: "rpc" } }]) {
      createSupabaseServiceClient.mockReturnValue(serviceClient(options as any));
      response = await request("/api/admin/generate-magic-link", { user_id: "00000000-0000-4000-8000-000000000001", email: "a@b.com" });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ ok: false, error: "create_failed" });
    }
  });

  it("forwards generate route when ADMIN_SECRET is set", async () => {
    vi.stubEnv("ADMIN_SECRET", " secret ");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, magic_url: "remote" }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await request("/api/admin/generate-magic-link", { user_id: "00000000-0000-4000-8000-000000000001", fleet_id: "00000000-0000-4000-8000-000000000002", email: "a@b.com", label: "L" });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, magic_url: "remote" });
    expect(fetchMock).toHaveBeenCalledWith("https://supabase.test/functions/v1/demo-magic-link", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer secret" }, body: JSON.stringify({ action: "create", user_id: "00000000-0000-4000-8000-000000000001", fleet_id: "00000000-0000-4000-8000-000000000002", email: "a@b.com", label: "L" }) });
    fetchMock.mockResolvedValueOnce(new Response("bad", { status: 200 }));
    const invalid = await request("/api/admin/generate-magic-link", { user_id: "00000000-0000-4000-8000-000000000001", email: "a@b.com" });
    expect(invalid.status).toBe(502);
    expect(await invalid.json()).toEqual({ ok: false, error: "upstream_invalid_response" });
    vi.unstubAllGlobals();
  });

  it("validates magic links and creates auth magic link", async () => {
    let response = await request("/api/demo/magic-link", { action: "bad", token: "x" }, { auth: false });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "token_not_found" });
    createSupabaseServiceClient.mockReturnValue(null);
    response = await request("/api/demo/magic-link", { action: "validate", token: "00000000-0000-4000-8000-000000000001" }, { auth: false });
    expect(response.status).toBe(503);
    const admin = serviceClient({ rpcData: { ok: true, email: "demo@x.com", fleet_id: "f1" }, generatedLink: { properties: { action_link: "https://magic.test/demo" } } });
    createSupabaseServiceClient.mockReturnValue(admin);
    response = await request("/api/demo/magic-link", { action: "validate", token: "00000000-0000-4000-8000-000000000001" }, { auth: false, origin: "http://localhost:5173" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, magic_link: "https://magic.test/demo", fleet_id: "f1" });
    expect(admin.rpc).toHaveBeenCalledWith("demo_validate_magic_link", { p_token: "00000000-0000-4000-8000-000000000001" });
    expect(admin.auth.admin.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "demo@x.com", options: { redirectTo: "http://localhost:5173/demo/onboarding" } });
  });

  it("handles validation and auth-link failures", async () => {
    for (const admin of [
      serviceClient({ rpcError: { message: "rpc" } }),
      serviceClient({ rpcData: null }),
      serviceClient({ rpcData: { ok: false } }),
      serviceClient({ rpcData: { ok: true } }),
      serviceClient({ rpcData: { ok: true, email: "a@b.com" }, generateError: { message: "auth" } }),
      serviceClient({ rpcData: { ok: true, email: "a@b.com" }, generatedLink: { properties: {} } }),
    ]) {
      createSupabaseServiceClient.mockReturnValue(admin);
      const response = await request("/api/demo/magic-link", { action: "validate", token: "00000000-0000-4000-8000-000000000001" }, { auth: false });
      expect([404, 500]).toContain(response.status);
    }
  });

  it("clears password marker after verified password change", async () => {
    const admin = serviceClient({ currentUsers: [
      { user: { id: "u1", app_metadata: { must_set_password: true, temporary_password_active: true, temporary_password_issued_at: "2026-08-27T10:00:00Z", keep: "x" }, updated_at: "2026-08-27T11:00:00Z" } },
      { user: { id: "u1", app_metadata: { must_set_password: false } } },
    ] });
    createSupabaseServiceClient.mockReturnValue(admin);
    const response = await request("/api/auth/clear-password-marker", {}, { auth: true });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, must_set_password: false });
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith("admin-1", { app_metadata: { must_set_password: false, temporary_password_active: false, temporary_password_issued_at: "2026-08-27T10:00:00Z", keep: "x" } });
  });

  it("enforces password marker security and verification", async () => {
    for (const current of [
      { user: { id: "u1", app_metadata: { temporary_password_active: true }, updated_at: "2026-08-27T11:00:00Z" } },
      { user: { id: "u1", app_metadata: { temporary_password_active: true, temporary_password_issued_at: "2026-08-27T12:00:00Z" }, updated_at: "2026-08-27T11:00:00Z" } },
      { user: { id: "u1", app_metadata: { temporary_password_active: true, temporary_password_issued_at: "2026-08-27T10:00:00Z" } } },
    ]) {
      createSupabaseServiceClient.mockReturnValue(serviceClient({ currentUsers: [current] }));
      const response = await request("/api/auth/clear-password-marker", {});
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ ok: false, error: "password_change_required" });
    }
    createSupabaseServiceClient.mockReturnValue(serviceClient({ currentUsers: [{ user: null }] }));
    let response = await request("/api/auth/clear-password-marker", {});
    expect(response.status).toBe(404);
    createSupabaseServiceClient.mockReturnValue(serviceClient({ updateUser: { user: null } }));
    response = await request("/api/auth/clear-password-marker", {});
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "password_marker_update_failed" });
    createSupabaseServiceClient.mockReturnValue(serviceClient({ currentUsers: [{ user: { id: "u1", app_metadata: {}, updated_at: "2026-08-27T11:00:00Z" } }, { user: { id: "u1", app_metadata: { must_set_password: true } } }] }));
    response = await request("/api/auth/clear-password-marker", {});
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "password_marker_not_cleared" });
  });
});