/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Admin demo password marker", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  function mockUserClient(userId: string) {
    vi.doMock("@/server/infra/supabaseUserClient", () => ({
      createSupabaseUserClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: userId } },
            error: null,
          }),
        },
      }),
    }));
  }

  it("ne nettoie pas must_set_password si Supabase refuse le changement de mot de passe", async () => {
    mockUserClient("user-1");
    const updateUserById = vi.fn().mockResolvedValue({
      data: { user: null },
      error: {
        code: "same_password",
        message: "New password should be different from the old password.",
      },
    });

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
    const res = await createServerApp().request("/api/auth/clear-password-marker", {
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
    expect(updateUserById).toHaveBeenCalledTimes(1);
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      password: "TemporaryPassword123!",
    });
  });

  it("change le mot de passe puis efface les deux marqueurs", async () => {
    mockUserClient("user-1");
    const updateUserById = vi
      .fn()
      .mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null })
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
            },
          },
        },
        error: null,
      });

    vi.doMock("@/server/infra/supabaseServiceClient", () => ({
      createSupabaseServiceClient: () => ({
        auth: { admin: { getUserById, updateUserById } },
      }),
    }));

    const { createServerApp } = await import("@/server/http/app");
    const res = await createServerApp().request("/api/auth/clear-password-marker", {
      method: "POST",
      headers: {
        Authorization: "Bearer user-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "NewStrongPassword123!" }),
    });

    expect(res.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledTimes(2);
    expect(updateUserById).toHaveBeenNthCalledWith(1, "user-1", {
      password: "NewStrongPassword123!",
    });
    expect(updateUserById).toHaveBeenNthCalledWith(
      2,
      "user-1",
      expect.objectContaining({
        app_metadata: expect.objectContaining({
          must_set_password: false,
          temporary_password_active: false,
          password_set_at: expect.any(String),
        }),
        user_metadata: expect.objectContaining({
          must_set_password: false,
          temporary_password_active: false,
        }),
      }),
    );
  });

  it("nettoie un marqueur legacy conserve uniquement dans user_metadata", async () => {
    mockUserClient("user-legacy");
    const updateUserById = vi
      .fn()
      .mockResolvedValueOnce({ data: { user: { id: "user-legacy" } }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: "user-legacy" } }, error: null });
    const getUserById = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "user-legacy",
            app_metadata: {},
            user_metadata: {
              full_name: "Legacy User",
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
            id: "user-legacy",
            app_metadata: {
              must_set_password: false,
              temporary_password_active: false,
            },
            user_metadata: {
              full_name: "Legacy User",
              must_set_password: false,
              temporary_password_active: false,
            },
          },
        },
        error: null,
      });

    vi.doMock("@/server/infra/supabaseServiceClient", () => ({
      createSupabaseServiceClient: () => ({
        auth: { admin: { getUserById, updateUserById } },
      }),
    }));

    const { createServerApp } = await import("@/server/http/app");
    const res = await createServerApp().request("/api/auth/clear-password-marker", {
      method: "POST",
      headers: {
        Authorization: "Bearer user-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "NewStrongPassword123!" }),
    });

    expect(res.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledTimes(2);
    expect(updateUserById).toHaveBeenNthCalledWith(
      2,
      "user-legacy",
      expect.objectContaining({
        user_metadata: expect.objectContaining({
          full_name: "Legacy User",
          must_set_password: false,
          temporary_password_active: false,
        }),
      }),
    );
  });

  it("retente uniquement la finalisation du marqueur apres une erreur transitoire", async () => {
    mockUserClient("user-1");
    const updateUserById = vi
      .fn()
      .mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null })
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

    vi.doMock("@/server/infra/supabaseServiceClient", () => ({
      createSupabaseServiceClient: () => ({
        auth: { admin: { getUserById, updateUserById } },
      }),
    }));

    const { createServerApp } = await import("@/server/http/app");
    const res = await createServerApp().request("/api/auth/clear-password-marker", {
      method: "POST",
      headers: {
        Authorization: "Bearer user-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "NewStrongPassword123!" }),
    });

    expect(res.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledTimes(3);
    expect(updateUserById).toHaveBeenNthCalledWith(1, "user-1", {
      password: "NewStrongPassword123!",
    });
  });
});
