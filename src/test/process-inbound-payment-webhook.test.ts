/** @vitest-environment node */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { runInboundPaymentWebhook } from "@/server/domain/billing/processInboundPaymentWebhook";

const ORG = "a0000000-0000-4000-8000-000000000001";
const FLEET = "a0000000-0000-4000-8000-000000000002";
const PLAN = "a0000000-0000-4000-8000-000000000003";
const PAY = "a0000000-0000-4000-8000-000000000004";
const SUB = "a0000000-0000-4000-8000-000000000005";

/** Chaîne PostgREST minimale pour le scénario « premier paiement réussi » sans véhicules. */
function createMockAdmin(): SupabaseClient {
  let paiementsFrom = 0;
  let abonnementsFrom = 0;

  const payment = {
    id: PAY,
    org_id: ORG,
    status: "pending",
    raw_payload: {
      planCode: "starter",
      vehicleCount: 0,
      durationMonths: 1,
      phoneNumber: "600000000",
      fleetId: FLEET,
    },
  };

  return {
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
        return {
          update: () => ({
            eq: async () => ({ error: null }),
          }),
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
                maybeSingle: async () => ({ data: { id: PLAN }, error: null }),
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
});
