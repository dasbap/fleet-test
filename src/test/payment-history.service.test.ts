import { describe, expect, it, vi } from "vitest";
import { PaymentHistoryService } from "@/services/payment-history.service";
import type { PaymentHistoryRepository } from "@/repositories/payment-history.repository";

function createService(repository: Partial<PaymentHistoryRepository>) {
  return new PaymentHistoryService(repository as PaymentHistoryRepository);
}

describe("PaymentHistoryService", () => {
  it("refuse getPaymentHistory sans orgId", async () => {
    const service = createService({});
    await expect(service.getPaymentHistory("")).rejects.toThrow(
      "L'identifiant organisation est requis",
    );
  });

  it("enrichit les paiements depuis raw_payload", async () => {
    const findPaymentsByOrg = vi.fn().mockResolvedValue([
      {
        id: "pay-1",
        org_id: "org-1",
        provider: "notch",
        provider_reference: null,
        amount: 15000,
        currency: "XAF",
        status: "successful",
        external_ref: null,
        idempotency_key: "key-1",
        raw_payload: { planCode: "pro", durationMonths: 3, vehicleCount: 5 },
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);

    const service = createService({ findPaymentsByOrg });
    const payments = await service.getPaymentHistory("org-1");

    expect(payments[0]?.planCode).toBe("pro");
    expect(payments[0]?.durationMonths).toBe(3);
    expect(payments[0]?.vehicleCount).toBe(5);
  });
});
