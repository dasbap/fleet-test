import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDemoBffRepository } from "@/repositories/admin-demo-bff.repository";

describe("AdminDemoBffRepository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renvoie une erreur stable quand le BFF local retourne une 404 vide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404, statusText: "Not Found" })),
    );
    const repository = new AdminDemoBffRepository();

    const result = await repository.createProspect("token", {
      email: "prospect@example.com",
      trial_days: 7,
      send_email: false,
      account_type: "prospect",
    });

    expect(result).toEqual({
      ok: false,
      error: "bff_route_unavailable",
    });
  });
});
