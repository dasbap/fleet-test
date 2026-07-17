import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc,
  },
}));

import { DriverProfileRepository } from "./driver-profile.repository";

describe("DriverProfileRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.from.mockReturnValue({ update: supabaseMocks.update, insert: supabaseMocks.insert });
    supabaseMocks.update.mockReturnValue({ eq: supabaseMocks.eq });
    supabaseMocks.eq.mockReturnValue({ select: supabaseMocks.select });
    supabaseMocks.select.mockReturnValue({ maybeSingle: supabaseMocks.maybeSingle });
    supabaseMocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabaseMocks.rpc.mockResolvedValue({
      data: {
        user_id: "driver-id",
        full_name: "Driver Test",
        phone: null,
        created_at: "2026-07-15T08:00:00+00:00",
      },
      error: null,
    });
  });

  it("utilise la RPC de profil quand l'update ne retourne aucune ligne", async () => {
    const repository = new DriverProfileRepository();

    await expect(
      repository.updateByDriverId("driver-id", {
        full_name: "Driver Test",
      }),
    ).resolves.toMatchObject({
      user_id: "driver-id",
      full_name: "Driver Test",
    });

    expect(supabaseMocks.insert).not.toHaveBeenCalled();
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("upsert_driver_profile_for_actor", {
      p_driver_user_id: "driver-id",
      p_full_name: "Driver Test",
      p_phone: null,
    });
  });
});
