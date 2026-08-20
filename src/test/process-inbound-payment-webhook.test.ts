/** @vitest-environment node */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { runInboundPaymentWebhook } from "@/server/domain/billing/processInboundPaymentWebhook";

const ORG = "a0000000-0000-4000-8000-000000000001";
const FLEET = "a0000000-0000-4000-8000-000000000002";
const PLAN = "a0000000-0000-4000-8000-000000000003";
const PAY = "a0000000-0000-4000-8000-000000000004";
const SUB = "a0000000-0000-4000-8000-000000000005";

function createMockAdmin(): SupabaseClient {
  let paiementsFrom = 0;
  let abonnementsFrom = 0;

  const payment = {
    id: PAY,
    org_id: ORG,
    provider: "notch",
    status: "pending",
    raw_payload: {
      planCode: "starter",
      vehicleCount: 1,
      durationMonths: 1,
      phoneNumber: "600000000",
      fleetId: FLEET,
    },
  };

  return {
    rpc: vi.fn(async (fn: string) => {
      if (fn === "claim_payment_webhook_effects") return { data: true, error: null };
      if (fn === "complete_payment_webhook_effects") return { data: true, error: null };
      if (fn === "release_payment_webhook_effects") return { data: true, error: null };
      throw new Error(`rpc inattendue: ${fn}`);
    }),
    from(table: string) {
      if (table === "paiements") {
        paiementsFrom += 1;
        if (paiementsFrom === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: payment, error: null }),
              }),
            }),
          };
        }
        const transitionChain = {
          eq: () => transitionChain,
          select: () => ({
            maybeSingle: async () => ({ data: { id: PAY }, error: null }),
          }),
        };
        return {
          update: () => transitionChain,
        };
      }
      if (table === "abonnements") {
        abonnementsFrom += 1;
        if (abonnementsFrom === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        if (abonnementsFrom === 2) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  lte: () => ({
                    gte: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: async () => ({ data: null, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: SUB }, error: null }),
            }),
          }),
        };
      }
      if (table === "flottes") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: FLEET, org_id: ORG }, error: null }),
            }),
          }),
        };
      }
      if (table === "plans") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: PLAN, code: "starter", max_vehicles: 1 }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "billing_events") {
        return {
          insert: () => ({
            then: (fn: (v: { error: null }) => void) => {
              fn({ error: null });
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "vehicules") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  returns: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`table inattendue: ${table}`);
    },
  } as unknown as SupabaseClient;
}

describe("runInboundPaymentWebhook", () => {
  it("active un abonnement lorsque le paiement passe à succeeded", async () => {
    const admin = createMockAdmin();
    const res = await runInboundPaymentWebhook(admin, "EXT-REF-1", "success");
    expect(res.normalizedStatus).toBe("succeeded");
    expect(res.subscriptionActivated).toBe(true);
    expect(res.subscriptionId).toBe(SUB);
    expect(admin.rpc).toHaveBeenCalledWith("claim_payment_webhook_effects", {
      p_payment_id: PAY,
      p_lease_seconds: 300,
    });
    expect(admin.rpc).toHaveBeenCalledWith("complete_payment_webhook_effects", {
      p_payment_id: PAY,
    });
  });

  it("retourne sans activation si transition impossible", async () => {
    const admin = {
      from(table: string) {
        if (table !== "paiements") throw new Error("unexpected");
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: PAY,
                  org_id: ORG,
                  provider: "notch",
                  status: "failed",
                  raw_payload: {},
                },
                error: null,
              }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient;
    const res = await runInboundPaymentWebhook(admin, "EXT-REF-2", "succeeded");
    expect(res.skippedReason).toBe("no_transition");
    expect(res.subscriptionActivated).toBe(false);
  });

  it("perd proprement une course compare-and-swap et n'applique aucun effet", async () => {
    let paiementsFrom = 0;
    const rpc = vi.fn();
    const admin = {
      rpc,
      from(table: string) {
        if (table !== "paiements") throw new Error("unexpected");
        paiementsFrom += 1;
        if (paiementsFrom === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: PAY,
                    org_id: ORG,
                    provider: "notch",
                    status: "pending",
                    raw_payload: {},
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        const chain = {
          eq: () => chain,
          select: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        };
        return { update: () => chain };
      },
    } as unknown as SupabaseClient;

    const res = await runInboundPaymentWebhook(admin, "EXT-RACE", "succeeded");
    expect(res.skippedReason).toBe("no_transition");
    expect(res.subscriptionActivated).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("n'applique pas deux fois les effets si le paiement est déjà claimé", async () => {
    const admin = createMockAdmin();
    (admin.rpc as ReturnType<typeof vi.fn>).mockImplementation(async (fn: string) => {
      if (fn === "claim_payment_webhook_effects") return { data: false, error: null };
      return { data: true, error: null };
    });

    const res = await runInboundPaymentWebhook(admin, "EXT-REF-3", "succeeded");
    expect(res.skippedReason).toBe("effects_in_progress_or_done");
    expect(res.subscriptionActivated).toBe(false);
  });
});
