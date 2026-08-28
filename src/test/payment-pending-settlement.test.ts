/** @vitest-environment node */
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { runInboundPaymentWebhook } from "@/server/domain/billing/processInboundPaymentWebhook";

const PAY = "a0000000-0000-4000-8000-000000000004";
const SUB = "a0000000-0000-4000-8000-000000000005";
const CLAIM = "a0000000-0000-4000-8000-000000000006";
const FLEET = "a0000000-0000-4000-8000-000000000002";
const ORG = "a0000000-0000-4000-8000-000000000001";

function createAdmin() {
  let paymentReads = 0;
  const subscriptionUpdate = vi.fn();

  const admin = {
    rpc: vi.fn(async (fn: string) => {
      if (fn === "claim_payment_webhook_effects") return { data: CLAIM, error: null };
      if (fn === "complete_payment_webhook_effects") return { data: true, error: null };
      if (fn === "release_payment_webhook_effects") return { data: true, error: null };
      throw new Error(`rpc inattendue: ${fn}`);
    }),
    from(table: string) {
      if (table === "paiements") {
        paymentReads += 1;
        if (paymentReads === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: PAY,
                    org_id: ORG,
                    provider: "notch",
                    status: "pending",
                    raw_payload: {
                      planCode: "pro",
                      vehicleCount: 5,
                      durationMonths: 1,
                      fleetId: FLEET,
                    },
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
            maybeSingle: async () => ({ data: { id: PAY }, error: null }),
          }),
        };
        return { update: () => chain };
      }

      if (table === "abonnements") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: SUB,
                  status: "pending_payment",
                  starts_at: "2026-08-26T00:00:00.000Z",
                  ends_at: "2026-09-26T00:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
          update: (values: Record<string, unknown>) => {
            subscriptionUpdate(values);
            const chain = {
              eq: () => chain,
              then: (resolve: (value: { error: null }) => unknown) =>
                Promise.resolve({ error: null }).then(resolve),
            };
            return chain;
          },
        };
      }

      if (table === "billing_events") {
        return {
          insert: () => ({
            then: (resolve: (value: { error: null }) => unknown) =>
              Promise.resolve({ error: null }).then(resolve),
          }),
        };
      }

      throw new Error(`table inattendue: ${table}`);
    },
  } as unknown as SupabaseClient;

  return { admin, subscriptionUpdate };
}

describe("pending subscription settlement", () => {
  it("passe pending_payment à inactive quand le PSP confirme le paiement", async () => {
    const { admin, subscriptionUpdate } = createAdmin();

    const result = await runInboundPaymentWebhook(
      admin,
      "notch-reference",
      "complete",
      "notch",
    );

    expect(result.normalizedStatus).toBe("succeeded");
    expect(result.subscriptionActivated).toBe(false);
    expect(result.subscriptionId).toBe(SUB);
    expect(subscriptionUpdate).toHaveBeenCalledWith({ status: "inactive" });
  });
});
