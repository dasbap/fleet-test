import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const { createSupabaseUserClient, createSupabaseServiceClient, createClient } = vi.hoisted(() => ({
  createSupabaseUserClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/server/infra/supabaseUserClient", () => ({ createSupabaseUserClient }));
vi.mock("@/server/infra/supabaseServiceClient", () => ({ createSupabaseServiceClient }));
vi.mock("@/server/env", () => ({ getAppUrl: () => "https://app.test", getSupabaseAnonKey: () => "anon", getSupabaseUrl: () => "https://supabase.test" }));

import { registerAdminProspectSecurityRoutes } from "@/server/http/routes/adminProspectSecurity";

const completeProfile = {
  full_name: "Awa Test",
  company_name: "Acme",
  phone: "+237699000000",
  company_identifier: "RCCM-123",
  country_code: "CM",
};

function validPayload(overrides: Record<string, unknown> = {}) {
  return { email: "a@b.com", ...completeProfile, ...overrides };
}

function userClient(options: any = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: "user" in options ? options.user : { id: "admin-1" } }, error: options.authError ?? null }) },
    rpc: vi.fn((name: string) => Promise.resolve({ data: name === "is_platform_admin" ? (options.isAdmin ?? true) : (options.isSuperAdmin ?? true) })),
  };
}

function serviceClient(options: any = {}) {
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  return {
    auth: { admin: {
      createUser: vi.fn().mockResolvedValue({ data: { user: "createdUser" in options ? options.createdUser : { id: "prospect-1" } }, error: options.createError ?? null }),
      deleteUser,
    } },
    rpc: vi.fn().mockResolvedValue({ data: "registration" in options ? options.registration : { ok: true, fleet_id: "fleet-1", trial_end: "2026-09-01" }, error: options.registrationError ?? null }),
    from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: options.notificationError ?? null }) })),
    deleteUser,
  };
}

function app() {
  const value = new Hono();
  registerAdminProspectSecurityRoutes(value);
  return value;
}

async function post(body: object | string, auth = true) {
  return app().request("/api/admin/create-prospect", {
    method: "POST",
    headers: { ...(auth ? { Authorization: "Bearer token" } : {}), "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("admin prospect security mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_SECRET;
    createSupabaseUserClient.mockReturnValue(userClient());
    createSupabaseServiceClient.mockReturnValue(serviceClient());
    createClient.mockReturnValue({ auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }) } });
  });

  it("requires authentication and admin permissions", async () => {
    expect((await post(validPayload(), false)).status).toBe(401);
    createSupabaseUserClient.mockReturnValue(userClient({ user: null }));
    expect((await post(validPayload())).status).toBe(401);
    createSupabaseUserClient.mockReturnValue(userClient({ authError: { message: "bad" } }));
    expect((await post(validPayload())).status).toBe(401);
    createSupabaseUserClient.mockReturnValue(userClient({ isAdmin: false }));
    const denied = await post(validPayload());
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ ok: false, error: "forbidden_not_platform_admin" });
  });

  it("rejects malformed bodies and business-invalid payloads", async () => {
    expect((await post("{")).status).toBe(400);
    for (const body of [
      validPayload({ email: "bad" }),
      validPayload({ company_name: "" }),
      validPayload({ account_type: "bad" }),
      validPayload({ trial_days: 0 }),
      validPayload({ trial_days: 32 }),
      validPayload({ fleet_id: "bad" }),
    ]) {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("invalid_payload");
    }
  });

  it("requires super admin for permanent access and service client", async () => {
    createSupabaseUserClient.mockReturnValue(userClient({ isSuperAdmin: false }));
    expect((await post(validPayload({ permanent_access: true }))).status).toBe(403);
    createSupabaseUserClient.mockReturnValue(userClient());
    createSupabaseServiceClient.mockReturnValue(null);
    expect((await post(validPayload())).status).toBe(503);
  });

  it("creates a normalized prospect", async () => {
    const admin = serviceClient();
    createSupabaseServiceClient.mockReturnValue(admin);
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    createClient.mockReturnValue({ auth: { resetPasswordForEmail } });
    const response = await post(validPayload({ email: "USER@Example.COM", fleet_id: "00000000-0000-4000-8000-000000000001" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(expect.objectContaining({ ok: true, user_id: "prospect-1", email: "user@example.com", fleet_id: "fleet-1", permanent_access: false, must_set_password: true }));
    expect(admin.rpc).toHaveBeenCalledWith("prospect_create_account", expect.objectContaining({ p_email: "user@example.com", p_company_name: "Acme", p_trial_days: 7, p_account_type: "prospect", p_permanent_access: false }));
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", { redirectTo: "https://app.test/set-password" });
  });

  it("handles auth creation and registration failures with rollback", async () => {
    createSupabaseServiceClient.mockReturnValue(serviceClient({ createError: { message: "create" } }));
    expect((await post(validPayload())).status).toBe(500);
    createSupabaseServiceClient.mockReturnValue(serviceClient({ createdUser: null }));
    expect((await post(validPayload())).status).toBe(500);
    for (const options of [{ registration: null }, { registration: { ok: false } }, { registrationError: { message: "rpc" } }]) {
      const admin = serviceClient(options);
      createSupabaseServiceClient.mockReturnValue(admin);
      const response = await post(validPayload());
      expect(response.status).toBe(500);
      expect(admin.deleteUser).toHaveBeenCalledWith("prospect-1");
    }
  });

  it("rolls back when reset email fails", async () => {
    const admin = serviceClient();
    createSupabaseServiceClient.mockReturnValue(admin);
    createClient.mockReturnValue({ auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ error: { message: "mail" } }) } });
    const response = await post(validPayload());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "password_setup_email_failed" });
    expect(admin.deleteUser).toHaveBeenCalledWith("prospect-1");
  });
});
