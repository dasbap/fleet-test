/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Admin demo password marker", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuse de nettoyer must_set_password si le mot de passe n'a pas ete change", async () => {
    vi.doMock("@/server/infra/supabaseUserClient", () => ({
      createSupabaseUserClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
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
            updateUserById: vi.fn(),
          },
        },
      }),
    }));

    const { createServerApp } = await import("@/server/http/app");
    const app = createServerApp();
    const res = await app.request("/api/auth/clear-password-marker", {
      method: "POST",
      headers: { Authorization: "Bearer user-token" },
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: "password_change_required",
    });
  });
});
