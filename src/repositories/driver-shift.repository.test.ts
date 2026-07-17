import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc,
  },
}));

import { DriverShiftRepository } from "./driver-shift.repository";

describe("DriverShiftRepository.updateClosure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.from.mockReturnValue({ update: supabaseMocks.update });
    supabaseMocks.update.mockReturnValue({ eq: supabaseMocks.eq });
    supabaseMocks.eq.mockReturnValue({ select: supabaseMocks.select });
    supabaseMocks.select.mockReturnValue({ maybeSingle: supabaseMocks.maybeSingle });
    supabaseMocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabaseMocks.rpc.mockResolvedValue({
      data: [{
        id: "closure-1",
        shift_id: "shift-1",
        revenue_declared: 12000,
        expected_revenue: null,
        revenue_gap: null,
        collection_mode: "cash",
        proof_type: "photo",
        proof_value: "proof",
        status: "validated",
        validated_by: "manager-1",
        validated_at: "2026-07-15T10:00:00.000Z",
        created_at: "2026-07-15T09:00:00.000Z",
      }],
      error: null,
    });
  });

  it("utilise la RPC de validation au lieu d'un update direct sous RLS", async () => {
    const repository = new DriverShiftRepository();

    await repository.updateClosure("closure-1", {
      status: "validated",
      validated_by: "manager-1",
      validated_at: "2026-07-15T10:00:00.000Z",
    });

    expect(supabaseMocks.from).not.toHaveBeenCalledWith("clotures_creneaux");
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("review_shift_closure_for_actor", {
      p_closure_id: "closure-1",
      p_status: "validated",
      p_validated_by: "manager-1",
      p_validated_at: "2026-07-15T10:00:00.000Z",
    });
  });
});
