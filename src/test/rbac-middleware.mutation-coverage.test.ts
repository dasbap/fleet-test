import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const { createSupabaseServiceClient, createSupabaseUserClient } = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  createSupabaseUserClient: vi.fn(),
}));
vi.mock("@/server/infra/supabaseServiceClient", () => ({ createSupabaseServiceClient }));
vi.mock("@/server/infra/supabaseUserClient", () => ({ createSupabaseUserClient }));
vi.mock("@/server/http/auth", () => ({ getBearerToken: (value?: string) => value?.startsWith("Bearer ") ? value.slice(7) : null }));
vi.mock("@/lib/supabase-runtime-errors", () => ({ throwIfSupabaseInfrastructureError: vi.fn() }));

import { requireAdmin, requireFleetAccess, requirePermission, requireRole } from "@/server/http/middleware/rbacMiddleware";

function query(result: any) {
  const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle: vi.fn().mockResolvedValue(result) };
  return chain;
}

function adminClient(state: { user?: any; authError?: any; demo?: any; adminProfile?: any; membership?: any } = {}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: state.user === undefined ? { id: "u1" } : state.user }, error: state.authError ?? null }) },
    from: vi.fn((table: string) => {
      if (table === "demo_profiles") return query({ data: state.demo ?? null, error: null });
      if (table === "admin_profiles") return query({ data: state.adminProfile ?? null, error: null });
      if (table === "flotte_adhesions") return query({ data: state.membership ?? null, error: null });
      throw new Error(`unexpected ${table}`);
    }),
  };
}

function userClient(result: any = { allowed: true, role: "manager" }) {
  return { rpc: vi.fn().mockResolvedValue({ data: result, error: null }) };
}

async function run(middleware: any, auth = true) {
  const app = new Hono();
  app.use("*", middleware);
  app.get("/x", (c) => c.json({ ok: true, role: c.get("rbacRole"), userId: c.get("rbacUserId"), fleetId: c.get("rbacFleetId") }));
  return app.request("/x", { headers: auth ? { Authorization: "Bearer token" } : {} });
}

describe("rbac middleware mutation coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseServiceClient.mockReturnValue(adminClient());
    createSupabaseUserClient.mockReturnValue(userClient());
  });

  it("requirePermission requires bearer and valid user", async () => {
    let response = await run(requirePermission("member.view" as any), false);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentification requise", code: "UNAUTHENTICATED" });
    createSupabaseServiceClient.mockReturnValue(adminClient({ user: null }));
    response = await run(requirePermission("member.view" as any));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Token invalide", code: "INVALID_TOKEN" });
  });

  it("blocks demo users from admin permissions", async () => {
    createSupabaseServiceClient.mockReturnValue(adminClient({ demo: { user_id: "u1" } }));
    const response = await run(requirePermission("admin.access" as any));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Non disponible en mode démo", code: "DEMO_BLOCKED", permission: "admin.access" });
  });

  it("denies and allows permission RPC results", async () => {
    createSupabaseUserClient.mockReturnValue(userClient({ allowed: false, role: "driver" }));
    let response = await run(requirePermission("member.view" as any, () => "fleet"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Permission insuffisante", code: "RBAC_DENIED", permission: "member.view", role: "driver" });
    createSupabaseUserClient.mockReturnValue(userClient(null));
    response = await run(requirePermission("member.view" as any));
    expect(response.status).toBe(403);
    expect((await response.json()).role).toBeNull();
    createSupabaseUserClient.mockReturnValue(userClient({ allowed: true, role: "manager" }));
    response = await run(requirePermission("member.view" as any, () => "fleet"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, role: "manager", userId: "u1" });
    expect(createSupabaseUserClient.mock.results.at(-1)?.value.rpc).toHaveBeenCalledWith("rbac_check_permission", { p_action: "member.view", p_fleet_id: "fleet" });
  });

  it("requireRole enforces hierarchy", async () => {
    for (const role of ["admin", "organizer", "manager"] as const) {
      createSupabaseServiceClient.mockReturnValue(adminClient({ membership: role === "admin" ? null : { role }, adminProfile: role === "admin" ? { id: "a", is_active: true, internal_role: "admin" } : null }));
      const response = await run(requireRole("manager", () => "fleet"));
      expect(response.status).toBe(200);
      expect((await response.json()).role).toBe(role);
    }
    createSupabaseServiceClient.mockReturnValue(adminClient({ membership: { role: "driver" } }));
    let response = await run(requireRole("manager", () => "fleet"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Rôle insuffisant", code: "RBAC_ROLE_DENIED", role: "driver", required: "manager" });
    createSupabaseServiceClient.mockReturnValue(adminClient());
    response = await run(requireRole("manager", () => "fleet"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Aucun rôle sur cette flotte", code: "NO_FLEET_ROLE" });
  });

  it("requireFleetAccess handles auth missing fleet admin deny and membership", async () => {
    let response = await run(requireFleetAccess(() => "fleet"), false);
    expect(response.status).toBe(401);
    response = await run(requireFleetAccess(() => undefined));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "fleet_id manquant", code: "MISSING_FLEET_ID" });
    createSupabaseServiceClient.mockReturnValue(adminClient({ adminProfile: { id: "a", is_active: true, internal_role: "super_admin" } }));
    response = await run(requireFleetAccess(() => "fleet"));
    expect(response.status).toBe(200);
    expect((await response.json()).role).toBe("admin");
    createSupabaseServiceClient.mockReturnValue(adminClient());
    response = await run(requireFleetAccess(() => "fleet"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Accès à cette flotte refusé", code: "FLEET_ACCESS_DENIED", fleet_id: "fleet" });
    createSupabaseServiceClient.mockReturnValue(adminClient({ membership: { role: "mechanic" } }));
    response = await run(requireFleetAccess(() => "fleet"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, role: "mechanic", userId: "u1", fleetId: "fleet" });
  });

  it("requireAdmin rejects auth demo missing client and non admins", async () => {
    let response = await run(requireAdmin(), false);
    expect(response.status).toBe(401);
    createSupabaseServiceClient.mockReturnValue(adminClient({ demo: { user_id: "u1" } }));
    response = await run(requireAdmin());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Non disponible en mode démo", code: "DEMO_BLOCKED" });
    createSupabaseServiceClient.mockReturnValueOnce(adminClient()).mockReturnValueOnce(adminClient()).mockReturnValueOnce(null);
    response = await run(requireAdmin());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Configuration serveur incorrecte" });
    createSupabaseServiceClient.mockReturnValue(adminClient({ adminProfile: { id: "a", internal_role: "viewer" } }));
    response = await run(requireAdmin());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Accès admin refusé", code: "NOT_PLATFORM_ADMIN" });
  });

  it("requireAdmin accepts both admin roles", async () => {
    for (const internal_role of ["admin", "super_admin"]) {
      createSupabaseServiceClient.mockReturnValue(adminClient({ adminProfile: { id: "a", is_active: true, internal_role } }));
      const response = await run(requireAdmin());
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, role: "admin", userId: "u1" });
    }
  });
});
