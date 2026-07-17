import { afterEach, describe, expect, it, vi } from "vitest";

import { getMissingSupabaseIntegrationEnv } from "../../tests/integration/helpers/supabaseTestClient";

describe("supabaseTestClient env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires only Supabase API and admin secrets", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_TEST_EMAIL", "");
    vi.stubEnv("SUPABASE_TEST_PASSWORD", "");

    expect(getMissingSupabaseIntegrationEnv()).toEqual([
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
  });
});
