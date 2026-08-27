import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const createSupabaseUserClient = vi.fn();
const createSupabaseServiceClient = vi.fn();
const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/server/infra/supabaseUserClient", () => ({ createSupabaseUserClient }));
vi.mock("@/server/infra/supabaseServiceClient", () => ({ createSupabaseServiceClient }));
vi.mock("@/server/env", () => ({
  getAppUrl: () => "https://app.test",
  getSupabaseAnonKey: () => "anon",
  getSupabaseUrl: () => "https://supabase.test",
}));

import { registerAdminProspectSecurityRoutes } from "@/server/http/routes/adminProspectSecurity";

function userClient(options?: { user?: any; authError?: any; isAdmin?: any; isSuperAdmin?: any }) {
  const rpc = vi.fn((name: string) => Promise.resolve({ data: name === "is_platform_admin" ? (options?.isAdmin ?? true) : (options?.isSuperAdmin ?? true) }));
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options?.user === undefined ? { id: "admin-1" } : options.user }, error: options?.authError ?? null }) },
    rpc,
  };
}

function serviceClient(options?: { createUser?: any; createError?: any; registration?: any; registrationError?: any; notificationError?: any }) {
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const createUser = vi.fn().mockResolvedValue({ data: { user: options?.createUser === undefined ? { id: "prospect-1" } : options.createUser }, error: options?.createError ?? null });
  const rpc = vi.fn().mockResolvedValue({ data: options?.registration === undefined ? { ok: true, fleet_id: "fleet-1", trial_end: "2026-09-01" } : options.registration, error: options?.registrationError ?? null });
  const insert = vi.fn().mockResolvedValue({ error: options?.notificationError ?? null });
  return { auth: { admin: { createUser, deleteUser } }, rpc, from: vi.fn(() => ({ insert })), createUser, deleteUser, rpc, insert };
}

function app() {
  const instance = new Hono();
  registerAdminProspectSecurityRoutes(instance);
  return instance;
}

async function post(body: string | object, auth = true) {
  return app().request("/api/admin/create-prospect", {
    method: "POST",
    headers: { ...(auth ? { Authorization: "Bearer token" } : {}), "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("admin prospect security mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.ADMIN_SECRET;
    createSupabaseUserClient.mockReturnValue(userClient());
    createSupabaseServiceClient.mockReturnValue(serviceClient());
    createClient.mockReturnValue({ auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }) } });
  });

  it("lets upstream route continue when ADMIN_SECRET exists", async () => {
    vi.stubEnv("ADMIN_SECRET", "secret");
    const instance = new Hono();
    registerAdminProspectSecurityRoutes(instance);
    instance.post("/api/admin/create-prospect", (c) => c.json({ forwarded: true }, 202));
    const response = await instance.request("/api/admin/create-prospect", { method: "POST", headers: { Authorization: "Bearer token" } });
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ forwarded: true });
  });

  it("requires bearer authentication", async () => {
    const response = await post({ email: "a@b.com" }, false);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "missing_auth_token" });
  });

  it("handles user client configuration failure", async () => {
    createSupabaseUserClient.mockImplementation(() => { throw new Error("config"); });
    const response = await post({ email: "a@b.com" });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "server_configuration_error" });
  });

  it("rejects invalid authenticated users", async () => {
    createSupabaseUserClient.mockReturnValue(userClient({ user: null }));
    let response = await post({ email: "a@b.com" });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_token" });
    createSupabaseUserClient.mockReturnValue(userClient({ authError: { message: "bad" } }));
    response = await post({ email: "a@b.com" });
    expect(response.status).toBe(401);
  });

  it("requires platform admin role", async () => {
    createSupabaseUserClient.mockReturnValue(userClient({ isAdmin: false }));
    const response = await post({ email: "a@b.com" });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "forbidden_not_platform_admin" });
  });

  it("rejects invalid JSON and invalid payload variants", async () => {
    let response = await post("{");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_json" });
    for (const body of [
      { email: "bad" },
      { email: "a@b.com", company_name: "" },
      { email: "a@b.com", account_type: "bad" },
      { email: "a@b.com", trial_days: 0 },
      { email: "a@b.com", trial_days: 32 },
      { email: "a@b.com", fleet_id: "bad" },
    ]) {
      response = await post(body);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("invalid_payload");
    }
  });

  it("requires super admin for permanent access", async () => {
    createSupabaseUserClient.mockReturnValue(userClient({ isSuperAdmin: false }));
    const response = await post({ email: "a@b.com", permanent_access: true });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "forbidden_super_admin_required" });
  });

  it("requires service role client", async () => {
    createSupabaseServiceClient.mockReturnValue(null);
    const response = await post({ email: "a@b.com" });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "server_configuration_error" });
  });

  it("creates a normalized prospect with exact defaults", async () => {
    const admin = serviceClient();
    createSupabaseServiceClient.mockReturnValue(admin);
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    createClient.mockReturnValue({ auth: { resetPasswordForEmail } });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00Z"));
    const response = await post({ email: "  USER@Example.COM ", company_name: "Acme", fleet_id: "00000000-0000-4000-8000-000000000001" });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, user_id: "prospect-1", email: "user@example.com", fleet_id: "fleet-1", trial_end: "2026-09-01", permanent_access: false, login_url: "https://app.test/auth?email=user%40example.com&prospect=1", must_set_password: true, password_delivery: "reset_email", function_version: "admin-demo-local-v3" });
    expect(admin.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: "user@example.com", email_confirm: true, app_metadata: expect.objectContaining({ must_set_password: true, temporary_password_active: true, temporary_password_issued_at: "2026-08-27T12:00:00.000Z" }), user_metadata: { account_type: "prospect", company_name: "Acme", trial_days: 7, permanent_access: false, created_by_demo: true } }));
    expect(admin.rpc).toHaveBeenCalledWith("prospect_create_account", { p_user_id: "prospect-1", p_email: "user@example.com", p_company_name: "Acme", p_invited_by: "admin-1", p_fleet_id: "00000000-0000-4000-8000-000000000001", p_trial_days: 7, p_account_type: "prospect", p_permanent_access: false });
    expect(createClient).toHaveBeenCalledWith("https://supabase.test", "anon", { auth: { persistSession: false, autoRefreshToken: false } });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", { redirectTo: "https://app.test/set-password" });
    vi.useRealTimers();
  });

  it("passes explicit account settings and sends welcome notification", async () => {
    const admin = serviceClient({ notificationError: { message: "mail queue" } });
    createSupabaseServiceClient.mockReturnValue(admin);
    const response = await post({ email: "x@y.com", company_name: "X", account_type: "investor", trial_days: 31, permanent_access: true, send_email: true });
    expect(response.status).toBe(201);
    expect(admin.createUser).toHaveBeenCalledWith(expect.objectContaining({ user_metadata: expect.objectContaining({ account_type: "investor", trial_days: 31, permanent_access: true }) }));
    expect(admin.insert).toHaveBeenCalledWith(expect.objectContaining({ to_email: "x@y.com", template_id: "prospect_welcome", metadata: expect.objectContaining({ company_name: "X", trial_days: 31, permanent_access: true, login_url: "https://app.test" }), status: "pending" }));
  });

  it("handles auth creation failures", async () => {
    createSupabaseServiceClient.mockReturnValue(serviceClient({ createError: { message: "create" } }));
    let response = await post({ email: "a@b.com" });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "auth_create_failed" });
    createSupabaseServiceClient.mockReturnValue(serviceClient({ createUser: null }));
    response = await post({ email: "a@b.com" });
    expect(response.status).toBe(500);
  });

  it("rolls back when registration fails", async () => {
    for (const options of [{ registration: null }, { registration: { ok: false } }, { registrationError: { message: "rpc" } }]) {
      const admin = serviceClient(options as any);
      createSupabaseServiceClient.mockReturnValue(admin);
      const response = await post({ email: "a@b.com" });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ ok: false, error: "registration_failed" });
      expect(admin.deleteUser).toHaveBeenCalledWith("prospect-1");
    }
  });

  it("rolls back when password setup email fails", async () => {
    const admin = serviceClient();
    createSupabaseServiceClient.mockReturnValue(admin);
    createClient.mockReturnValue({ auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ error: { message: "mail" } }) } });
    const response = await post({ email: "a@b.com" });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "password_setup_email_failed" });
    expect(admin.deleteUser).toHaveBeenCalledWith("prospect-1");
  });
});
