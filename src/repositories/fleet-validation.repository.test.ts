import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

import { FleetValidationRepository } from "./fleet-validation.repository";

describe("FleetValidationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.from.mockReturnValue({ select: supabaseMocks.select });
    supabaseMocks.select.mockReturnValue({ eq: supabaseMocks.eq });
    supabaseMocks.eq.mockReturnValue({ maybeSingle: supabaseMocks.maybeSingle });
    supabaseMocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("ignore les identifiants de creneau offline avant d'interroger Supabase", async () => {
    const repository = new FleetValidationRepository();

    await expect(
      repository.findActiveValidationByCreneauId("offline-9cf4dbdf-8b59-4daa-a8ac-de8b3c8daa4d"),
    ).resolves.toBeNull();

    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });
});
