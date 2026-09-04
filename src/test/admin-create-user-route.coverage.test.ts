import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  applyCors: vi.fn(),
  handlePreflight: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("../../api/_lib/vercel-api.js", () => apiMock);
vi.mock("@supabase/supabase-js", () => ({ createClient: supabaseMock.createClient }));

import handler from "../../api/admin/create-user";

const makeResponse = () => {
  const res: Record<string, unknown> = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as never;
};

const makeRequest = (body: unknown = {}) => ({
  method: "POST",
  body,
  headers: {},
});

const makeQuery = (result: unknown) => {
  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => result);
  return query;
};

const makeAuth = (options: {
  admin?: boolean;
  superAdmin?: boolean;
  serviceRoleKey?: string;
  membership?: { data?: { role?: string } | null; error?: unknown };
} = {}) => {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_platform_admin") return { data: options.admin ?? true };
    if (name === "is_platform_super_admin") return { data: options.superAdmin ?? false };
    return { data: null };
  });
  const membership = options.membership ?? { data: { role: "organizer" }, error: null };
  const client = {
    rpc,
    from: vi.fn(() => makeQuery(membership)),
  };
  return {
    user: { id: "provisioner-1" },
    env: {
      url: "https://supabase.example",
      serviceRoleKey: options.serviceRoleKey === undefined ? "service-role" : options.serviceRoleKey,
      anonKey: "anon-key",
      appUrl: "https://app.example/",
    },
    client,
  };
};

const makeClients = (options: {
  rateLimit?: { data?: unknown; error?: unknown };
  createUser?: { data?: unknown; error?: unknown };
  profileError?: unknown;
  adminProfileError?: unknown;
  membershipError?: unknown;
  resetError?: unknown;
} = {}) => {
  const deleteUser = vi.fn(async () => ({ error: null }));
  const upsert = vi.fn(async (table: string) => ({ error: null }));
  const admin = {
    rpc: vi.fn(async () => options.rateLimit ?? { data: { ok: true }, error: null }),
    auth: {
      admin: {
        createUser: vi.fn(async () =>
          options.createUser ?? { data: { user: { id: "new-user-1" } }, error: null },
        ),
        deleteUser,
      },
    },
    from: vi.fn((table: string) => ({
      upsert: vi.fn(async () => {
        if (table === "profils") return { error: options.profileError ?? null };
        if (table === "admin_profiles") return { error: options.adminProfileError ?? null };
        if (table === "flotte_adhesions") return { error: options.membershipError ?? null };
        return { error: null };
      }),
    })),
  };
  const publicClient = {
    auth: {
      resetPasswordForEmail: vi.fn(async () => ({ error: options.resetError ?? null })),
    },
  };
  supabaseMock.createClient.mockImplementation((_url: string, key: string) =>
    key === "service-role" ? admin : publicClient,
  );
  return { admin, publicClient, deleteUser, upsert };
};

const expectJson = (res: never, status: number, body: unknown) => {
  const typed = res as unknown as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  expect(typed.status).toHaveBeenCalledWith(status);
  expect(typed.json).toHaveBeenCalledWith(body);
};

const validBody = (overrides: Record<string, unknown> = {}) => ({
  email: "  USER@Example.com ",
  full_name: " Test User ",
  phone: " +221770000000 ",
  fleet_id: " fleet-1 ",
  role: " manager ",
  ...overrides,
});

describe("admin create-user route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.handlePreflight.mockReturnValue(false);
    apiMock.requireAuthenticatedUser.mockResolvedValue(makeAuth());
    makeClients();
  });

  it("applique CORS et termine sur preflight", async () => {
    apiMock.handlePreflight.mockReturnValue(true);
    const req = makeRequest(validBody()) as never;
    const res = makeResponse();
    await handler(req, res);
    expect(apiMock.applyCors).toHaveBeenCalledWith(req, res);
    expect(apiMock.requireAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("refuse les méthodes autres que POST", async () => {
    const req = { ...makeRequest(validBody()), method: "GET" } as never;
    const res = makeResponse();
    await handler(req, res);
    expectJson(res, 405, { ok: false, error: "method_not_allowed" });
  });

  it("s'arrête si l'authentification échoue", async () => {
    apiMock.requireAuthenticatedUser.mockResolvedValue(null);
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expect((res as unknown as { status: ReturnType<typeof vi.fn> }).status).not.toHaveBeenCalled();
  });

  it("refuse une configuration sans service role", async () => {
    apiMock.requireAuthenticatedUser.mockResolvedValue(makeAuth({ serviceRoleKey: "" }));
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expectJson(res, 500, { ok: false, error: "server_configuration_error" });
  });

  it.each([null, [], "text", 42])("refuse un body invalide %#", async (body) => {
    const res = makeResponse();
    await handler(makeRequest(body) as never, res);
    expectJson(res, 400, { ok: false, error: "invalid_body" });
  });

  it("refuse un mot de passe fourni", async () => {
    const res = makeResponse();
    await handler(makeRequest(validBody({ password: "secret" })) as never, res);
    expectJson(res, 400, { ok: false, error: "password_must_not_be_provided" });
  });

  it.each([
    ["", "vide"],
    ["invalid", "sans arobase"],
    [`${"a".repeat(315)}@x.com`, "trop long"],
  ])("refuse un email %s", async (email) => {
    const res = makeResponse();
    await handler(makeRequest(validBody({ email })) as never, res);
    expectJson(res, 400, { ok: false, error: "invalid_email" });
  });

  it.each([
    [{ full_name: "x".repeat(201) }, "nom"],
    [{ phone: "1".repeat(65) }, "téléphone"],
  ])("refuse un champ profil trop long", async (override) => {
    const res = makeResponse();
    await handler(makeRequest(validBody(override)) as never, res);
    expectJson(res, 400, { ok: false, error: "invalid_profile_fields" });
  });

  it.each([
    [{ role: "admin" }],
    [{ platform_admin: true, role: "manager" }],
  ])("réserve la création admin au super admin", async (override) => {
    apiMock.requireAuthenticatedUser.mockResolvedValue(makeAuth({ admin: true, superAdmin: false }));
    const res = makeResponse();
    await handler(makeRequest(validBody(override)) as never, res);
    expectJson(res, 403, { ok: false, error: "forbidden_super_admin_required" });
  });

  it("refuse un rôle flotte sans flotte", async () => {
    const res = makeResponse();
    await handler(makeRequest(validBody({ fleet_id: "", role: "manager" })) as never, res);
    expectJson(res, 400, { ok: false, error: "missing_fleet" });
  });

  it("refuse un rôle inconnu", async () => {
    const res = makeResponse();
    await handler(makeRequest(validBody({ role: "unknown" })) as never, res);
    expectJson(res, 400, { ok: false, error: "invalid_role" });
  });

  it("refuse un organisateur sans flotte pour un non-admin", async () => {
    apiMock.requireAuthenticatedUser.mockResolvedValue(makeAuth({ admin: false }));
    const res = makeResponse();
    await handler(makeRequest(validBody({ fleet_id: "", role: "organizer" })) as never, res);
    expectJson(res, 403, { ok: false, error: "forbidden_fleet_scope" });
  });

  it("refuse une flotte hors scope organisateur", async () => {
    apiMock.requireAuthenticatedUser.mockResolvedValue(
      makeAuth({ admin: false, membership: { data: { role: "manager" }, error: null } }),
    );
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expectJson(res, 403, { ok: false, error: "forbidden_fleet_scope" });
  });

  it("refuse une flotte si la vérification membership échoue", async () => {
    apiMock.requireAuthenticatedUser.mockResolvedValue(
      makeAuth({ admin: false, membership: { data: null, error: new Error("db") } }),
    );
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expectJson(res, 403, { ok: false, error: "forbidden_fleet_scope" });
  });

  it("autorise un organisateur sur sa propre flotte", async () => {
    apiMock.requireAuthenticatedUser.mockResolvedValue(
      makeAuth({ admin: false, membership: { data: { role: "organizer" }, error: null } }),
    );
    const clients = makeClients();
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expectJson(res, 201, {
      ok: true,
      user_id: "new-user-1",
      email: "user@example.com",
      must_set_password: true,
      password_delivery: "reset_email",
    });
    expect(clients.admin.from).toHaveBeenCalledWith("flotte_adhesions");
  });

  it("retourne 503 si le rate-limit ne peut pas être vérifié", async () => {
    makeClients({ rateLimit: { data: null, error: new Error("rpc down") } });
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expectJson(res, 503, { ok: false, error: "rate_limit_check_failed" });
  });

  it("retourne 429 quand la limite est dépassée", async () => {
    makeClients({ rateLimit: { data: { ok: false, reset_at: "2026-08-28T00:00:00Z" }, error: null } });
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expectJson(res, 429, {
      ok: false,
      error: "rate_limit_exceeded",
      reset_at: "2026-08-28T00:00:00Z",
    });
  });

  it("gère une réponse rate-limit vide", async () => {
    makeClients({ rateLimit: { data: null, error: null } });
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expectJson(res, 429, { ok: false, error: "rate_limit_exceeded", reset_at: undefined });
  });

  it("mappe un utilisateur déjà existant en 409", async () => {
    makeClients({ createUser: { data: { user: null }, error: new Error("User already registered") } });
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expectJson(res, 409, { ok: false, error: "user_already_exists" });
  });

  it.each([
    [{ data: { user: null }, error: new Error("provider failure") }],
    [{ data: { user: null }, error: null }],
  ])("mappe un échec de création auth en 500", async (createUser) => {
    makeClients({ createUser });
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expectJson(res, 500, { ok: false, error: "auth_create_failed" });
  });

  it("supprime l'utilisateur si le profil échoue", async () => {
    const clients = makeClients({ profileError: new Error("profile") });
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expect(clients.deleteUser).toHaveBeenCalledWith("new-user-1");
    expectJson(res, 500, { ok: false, error: "profile_create_failed" });
  });

  it("supprime l'utilisateur si le profil admin échoue", async () => {
    apiMock.requireAuthenticatedUser.mockResolvedValue(makeAuth({ admin: true, superAdmin: true }));
    const clients = makeClients({ adminProfileError: new Error("admin profile") });
    const res = makeResponse();
    await handler(makeRequest(validBody({ role: "admin", fleet_id: "" })) as never, res);
    expect(clients.deleteUser).toHaveBeenCalledWith("new-user-1");
    expectJson(res, 500, { ok: false, error: "admin_profile_create_failed" });
  });

  it("supprime l'utilisateur si l'adhésion flotte échoue", async () => {
    const clients = makeClients({ membershipError: new Error("membership") });
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expect(clients.deleteUser).toHaveBeenCalledWith("new-user-1");
    expectJson(res, 500, { ok: false, error: "membership_create_failed" });
  });

  it("supprime l'utilisateur si l'e-mail de définition du mot de passe échoue", async () => {
    const clients = makeClients({ resetError: new Error("mail") });
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);
    expect(clients.deleteUser).toHaveBeenCalledWith("new-user-1");
    expectJson(res, 502, { ok: false, error: "password_setup_email_failed" });
  });

  it("crée un utilisateur de flotte et envoie le reset password", async () => {
    const clients = makeClients();
    const res = makeResponse();
    await handler(makeRequest(validBody()) as never, res);

    expect(clients.admin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        email_confirm: true,
        password: expect.any(String),
        app_metadata: expect.objectContaining({ must_set_password: true, temporary_password_active: true }),
        user_metadata: {
          full_name: "Test User",
          phone: "+221770000000",
          created_by_admin: "provisioner-1",
        },
      }),
    );
    expect(clients.publicClient.auth.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://app.example/auth/update-password",
    });
    expectJson(res, 201, {
      ok: true,
      user_id: "new-user-1",
      email: "user@example.com",
      must_set_password: true,
      password_delivery: "reset_email",
    });
  });

  it("crée un admin plateforme sans adhésion flotte", async () => {
    apiMock.requireAuthenticatedUser.mockResolvedValue(makeAuth({ admin: true, superAdmin: true }));
    const clients = makeClients();
    const res = makeResponse();
    await handler(makeRequest(validBody({ role: "admin", fleet_id: "", full_name: "", phone: "" })) as never, res);
    expect(clients.admin.from).toHaveBeenCalledWith("admin_profiles");
    expect(clients.admin.from).not.toHaveBeenCalledWith("flotte_adhesions");
    expect(clients.admin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ user_metadata: expect.objectContaining({ full_name: null, phone: null }) }),
    );
    expectJson(res, 201, expect.objectContaining({ ok: true, user_id: "new-user-1" }));
  });
});
