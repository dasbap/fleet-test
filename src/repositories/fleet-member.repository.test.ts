import { beforeEach, describe, expect, it, vi } from "vitest";
import { FleetMemberRepository } from "./fleet-member.repository";
import { withConsoleSilenced } from "@/test/withConsoleSilenced";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string, args: unknown) => rpcMock(name, args),
    from: (table: string) => fromMock(table),
  },
}));

describe("FleetMemberRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to direct fleet member reads when get_fleet_members is missing from PostgREST", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.get_fleet_members(p_fleet_id) in the schema cache",
      },
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "flotte_adhesions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "membership-1",
                    user_id: "user-1",
                    fleet_id: "fleet-1",
                    role: "manager",
                    is_active: true,
                    created_at: "2026-07-02T08:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ user_id: "user-1", full_name: "Jean Dupont", phone: "+237600000000" }],
            error: null,
          }),
        }),
      };
    });

    await withConsoleSilenced(
      (_method, args) =>
        typeof args[0] === "string" &&
        (args[0] as string).startsWith("get_fleet_members RPC unavailable;"),
      async () => {
        const members = await new FleetMemberRepository().findAllViaRpc("fleet-1");

        expect(members).toEqual([
          {
            id: "membership-1",
            user_id: "user-1",
            fleet_id: "fleet-1",
            role: "manager",
            is_active: true,
            created_at: "2026-07-02T08:00:00Z",
            profile: {
              full_name: "Jean Dupont",
              phone: "+237600000000",
            },
            email: null,
          },
        ]);
      },
    );
  });
});
