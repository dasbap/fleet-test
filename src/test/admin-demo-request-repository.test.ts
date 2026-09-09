import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDemoRequestRepository } from "@/repositories/admin-demo-request.repository";
import { supabase } from "@/integrations/supabase/client";

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    functions: { invoke },
  },
}));

describe("AdminDemoRequestRepository", () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockReset();
    invoke.mockReset();
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

  it("envoie immediatement le mail personnalise apres une decision manuelle", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { ok: true }, error: null } as never);
    invoke.mockResolvedValue({ data: { ok: true, sent: 1 }, error: null });

    const result = await new AdminDemoRequestRepository().finalize({
      requestId: "request-1",
      status: "refused",
      reason: "Dossier incomplet",
    });

    expect(invoke).toHaveBeenCalledWith("process-notification-queue", {
      body: { request_id: "request-1" },
    });
    expect(result).toEqual({ emailSent: true });
  });
});
