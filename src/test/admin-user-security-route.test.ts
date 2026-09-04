import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  applyCors: vi.fn(),
  handlePreflight: vi.fn(),
  requirePlatformAdmin: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("../../api/_lib/vercel-api.js", () => apiMock);
vi.mock("@supabase/supabase-js", () => ({ createClient: supabaseMock.createClient }));

import handler from "../../api/admin/user-security";

const makeResponse = () => {
  const res: Record<string, unknown> = {};
  res.setHeader = vi.fn(() => res);
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as never;
};

const expectJson = (res: never, status: number, body: unknown) => {
  const typed = res as unknown as {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
  expect(typed.status).toHaveBeenCalledWith(status);
  expect(typed.json).toHaveBeenCalledWith(body);
};

function makeQuery(
  listResult: { data: unknown; error: unknown },
  singleResult: { data: unknown; error: unknown },
) {
  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => singleResult);
  query.then = (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
  ) => Promise.resolve(resolve(listResult));
  return query;
}

function setup(options: {
  callerSuperAdmin?: boolean;
  targetAdmin?: boolean;
  updateError?: unknown;
  linkError?: unknown;
} = {}) {
  const target = {
    id: "user-1",
    email: "user@example.com",
    created_at: "2026-09-01T00:00:00Z",
    last_sign_in_at: null,
    app_metadata: { keep: "value", must_set_password: false },
    user_metadata: { full_name: "User Test" },
  };

  const updateUserById = vi.fn(async () => ({
    data: { user: target },
    error: options.updateError ?? null,
  }));
  const generateLink = vi.fn(async () => ({
    data: {
      properties: {
        action_link: "https://supabase.example/recovery",
      },
    },
    error: options.linkError ?? null,
  }));

  const admin = {
    auth: {
      admin: {
        listUsers: vi.fn(async () => ({ data: { users: [target] }, error: null })),
        getUserById: vi.fn(async () => ({ data: { user: target }, error: null })),
        updateUserById,
        generateLink,
      },
    },
    from: vi.fn(() =>
      makeQuery(
        {
          data: options.targetAdmin ? [{ user_id: "user-1" }] : [],
          error: null,
        },
        {
          data: options.targetAdmin ? { user_id: "user-1" } : null,
          error: null,
        },
      ),
    ),
  };

  supabaseMock.createClient.mockReturnValue(admin);
  apiMock.requirePlatformAdmin.mockResolvedValue({
    user: { id: "admin-1" },
    env: {
      url: "https://supabase.example",
      serviceRoleKey: "service-role",
      appUrl: "https://app.example/",
    },
    client: {
      rpc: vi.fn(async () => ({
        data: options.callerSuperAdmin ?? false,
        error: null,
      })),
    },
  });

  return { admin, updateUserById, generateLink };
}

describe("admin user-security route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.handlePreflight.mockReturnValue(false);
    setup();
  });

  it("liste les comptes et leur etat mot de passe", async () => {
    const res = makeResponse();
    await handler({ method: "GET", headers: {} } as never, res);
    expectJson(res, 200, {
      ok: true,
      users: [
        {
          id: "user-1",
          email: "user@example.com",
          full_name: "User Test",
          created_at: "2026-09-01T00:00:00Z",
          last_sign_in_at: null,
          must_set_password: false,
          is_platform_admin: false,
        },
      ],
    });
  });

  it("force le changement de mot de passe en conservant les metadata", async () => {
    const { updateUserById } = setup();
    const res = makeResponse();
    await handler(
      {
        method: "POST",
        headers: {},
        body: { user_id: "user-1", action: "force_password_change" },
      } as never,
      res,
    );

    expect(updateUserById).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        app_metadata: expect.objectContaining({
          keep: "value",
          must_set_password: true,
          temporary_password_active: false,
          password_change_required_by: "admin-1",
        }),
      }),
    );
    expectJson(res, 200, { ok: true, must_set_password: true });
  });

  it("reserve la creation d'un lien recovery au super-admin", async () => {
    const { generateLink } = setup({ callerSuperAdmin: false });
    const res = makeResponse();
    await handler(
      {
        method: "POST",
        headers: {},
        body: { user_id: "user-1", action: "create_recovery_link" },
      } as never,
      res,
    );

    expect(generateLink).not.toHaveBeenCalled();
    expectJson(res, 403, {
      ok: false,
      error: "forbidden_super_admin_required",
    });
  });

  it("cree un lien recovery pour le super-admin", async () => {
    const { generateLink } = setup({ callerSuperAdmin: true });
    const res = makeResponse();
    await handler(
      {
        method: "POST",
        headers: {},
        body: { user_id: "user-1", action: "create_recovery_link" },
      } as never,
      res,
    );

    expect(generateLink).toHaveBeenCalledWith({
      type: "recovery",
      email: "user@example.com",
      options: { redirectTo: "https://app.example/auth/update-password" },
    });
    expectJson(res, 200, {
      ok: true,
      recovery_link: "https://supabase.example/recovery",
      email: "user@example.com",
    });
  });

  it("protege les admins plateforme d'un admin non super-admin", async () => {
    setup({ targetAdmin: true, callerSuperAdmin: false });
    const res = makeResponse();
    await handler(
      {
        method: "POST",
        headers: {},
        body: { user_id: "user-1", action: "force_password_change" },
      } as never,
      res,
    );
    expectJson(res, 403, {
      ok: false,
      error: "forbidden_super_admin_required",
    });
  });

  it("autorise le super-admin a gerer un admin plateforme", async () => {
    const { updateUserById } = setup({
      targetAdmin: true,
      callerSuperAdmin: true,
    });
    const res = makeResponse();
    await handler(
      {
        method: "POST",
        headers: {},
        body: { user_id: "user-1", action: "force_password_change" },
      } as never,
      res,
    );
    expect(updateUserById).toHaveBeenCalled();
    expectJson(res, 200, { ok: true, must_set_password: true });
  });
});
