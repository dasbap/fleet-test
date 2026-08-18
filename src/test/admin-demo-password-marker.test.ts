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
});
