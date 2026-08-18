/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Admin demo password marker", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("ne nettoie pas must_set_password si Supabase refuse le changement de mot de passe", async () => {
    const updateUserById = vi.fn();

    vi.doMock("@/server/infra/supabaseUserClient", () => ({
      createSupabaseUserClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
          }),
          updateUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: {
              code: "same_password",
              message: "New password should be different from the old password.",
            },
          }),
        },
      }),
    }));

    vi.doMock("@/server/infra/supabaseServiceClient", () => ({
      createSupabaseServiceClient: () => ({
        auth: {
          admin: {
            getUserById: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: "user-1",
                  app_metadata: {
                    must_set_password: true,
                    temporary_password_active: true,
                  },
                },
              },
              error: null,
            }),
            updateUserById,
          },
        },
      }),
    }));

    const { createServerApp } = await import("@/server/http/app");
    const app = createServerApp();
    const res = await app.request("/api/auth/clear-password-marker", {
      method: "POST",
      headers: {
        Authorization: "Bearer user-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "TemporaryPassword123!" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "same_password",
      details: "New password should be different from the old password.",
    });
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("change le mot de passe puis efface les deux marqueurs", async () => {
    const updateUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const updateUserById = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const getUserById = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "user-1",
            app_metadata: {
              must_set_password: true,
              temporary_password_active: true,
              temporary_password_issued_at: "2026-08-18T10:00:00.000Z",
            },
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "user-1",
            app_metadata: {
              must_set_password: false,
              temporary_password_active: false,
              password_set_at: "2026-08-18T12:00:00.000Z",
            },
          },
        },
        error: null,
      });

    vi.doMock("@/server/infra/supabaseUserClient", () => ({
      createSupabaseUserClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
          }),
          updateUser,
        },
      }),
    }));

    vi.doMock("@/server/infra/supabaseServiceClient", () => ({
      createSupabaseServiceClient: () => ({
        auth: { admin: { getUserById, updateUserById } },
      }),
    }));

    const { createServerApp } = await import("@/server/http/app");
    const app = createServerApp();
    const res = await app.request("/api/auth/clear-password-marker", {
      method: "POST",
      headers: {
        Authorization: "Bearer user-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "NewStrongPassword123!" }),
    });

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith({ password: "NewStrongPassword123!" });
    expect(updateUserById).toHaveBeenCalledTimes(1);
    expect(updateUserById).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        app_metadata: expect.objectContaining({
          must_set_password: false,
          temporary_password_active: false,
          password_set_at: expect.any(String),
        }),
      }),
    );
    expect(await res.json()).toEqual(
      expect.objectContaining({
        ok: true,
        must_set_password: false,
        password_set_at: expect.any(String),
      }),
    );
  });

  it("retente uniquement la finalisation du marqueur apres une erreur transitoire", async () => {
    const updateUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const updateUserById = vi
      .fn()
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "temporary failure" } })
      .mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });
    const getUserById = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "user-1",
            app_metadata: {
              must_set_password: true,
              temporary_password_active: true,
            },
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "user-1",
            app_metadata: {
              must_set_password: false,
              temporary_password_active: false,
            },
          },
        },
        error: null,
      });

    vi.doMock("@/server/infra/supabaseUserClient", () => ({
      createSupabaseUserClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
          }),
          updateUser,
        },
      }),
    }));

    vi.doMock("@/server/infra/supabaseServiceClient", () => ({
      createSupabaseServiceClient: () => ({
        auth: { admin: { getUserById, updateUserById } },
      }),
    }));

    const { createServerApp } = await import("@/server/http/app");
    const app = createServerApp();
    const res = await app.request("/api/auth/clear-password-marker", {
      method: "POST",
      headers: {
        Authorization: "Bearer user-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "NewStrongPassword123!" }),
    });

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUserById).toHaveBeenCalledTimes(2);
  });
});
