import { beforeEach, describe, expect, it, vi } from "vitest";

const { createEphemeralSupabaseClient, getUser, insert } = vi.hoisted(() => ({
  createEphemeralSupabaseClient: vi.fn(),
  getUser: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ createEphemeralSupabaseClient }));

import { DemoRequestRepository } from "@/repositories/demo-request.repository";

const input = {
  full_name: "Jean Dupont",
  email: "contact@transcam.cm",
  company: "TransCam",
  phone: "+237600000000",
  company_identifier: "RCCM-123",
  country_code: "CM",
};

describe("DemoRequestRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "verified-user",
          email: input.email,
          user_metadata: { demo_verification_pending: true },
        },
      },
      error: null,
    });
    insert.mockResolvedValue({ error: null });
    createEphemeralSupabaseClient.mockReturnValue({
      auth: { getUser },
      from: vi.fn(() => ({ insert })),
    });
  });

  it("uses the verified token for the RLS insert", async () => {
    const repository = new DemoRequestRepository();
    await repository.create(input, "verified-jwt");

    expect(createEphemeralSupabaseClient).toHaveBeenCalledWith("verified-jwt");
    expect(getUser).toHaveBeenCalledWith("verified-jwt");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      email: input.email,
      verified_user_id: "verified-user",
    }));
  });

  it("turns an RLS deployment failure into a user-facing configuration error", async () => {
    insert.mockResolvedValue({
      error: {
        code: "42501",
        message: 'new row violates row-level security policy for table "demo_requests"',
        details: null,
      },
    });

    const repository = new DemoRequestRepository();
    await expect(repository.create(input, "verified-jwt")).rejects.toThrow(
      "Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard.",
    );
  });

  it("rejects duplicate demo emails with a clear message", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    const repository = new DemoRequestRepository();

    await expect(repository.create(input, "verified-jwt")).rejects.toThrow(
      "Cette adresse e-mail a déjà été utilisée pour une demande E-Samba.",
    );
  });
});
