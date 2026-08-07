import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDemoRequestRepository } from "@/repositories/admin-demo-request.repository";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("AdminDemoRequestRepository", () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockReset();
  });

  it("classe une RPC demo absente comme une migration manquante", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.admin_list_demo_requests",
      },
    } as never);

    await expect(new AdminDemoRequestRepository().list()).rejects.toMatchObject({
      code: "DEMO_REQUEST_SCHEMA_MISSING",
    });
  });
});
