import { describe, expect, it } from "vitest";
import {
  canTransitionPaymentStatus,
  isTerminalPaymentStatus,
  normalizeInboundPaymentStatus,
} from "@/lib/billing/paymentStates";

describe("paymentStates", () => {
  it("normalise les synonymes PSP vers succeeded", () => {
    expect(normalizeInboundPaymentStatus("success")).toBe("succeeded");
    expect(normalizeInboundPaymentStatus("PAID")).toBe("succeeded");
    expect(normalizeInboundPaymentStatus("completed")).toBe("succeeded");
  });

  it("normalise les échecs", () => {
    expect(normalizeInboundPaymentStatus("declined")).toBe("failed");
    expect(normalizeInboundPaymentStatus("ERROR")).toBe("failed");
  });

  it("refuse les statuts inconnus", () => {
    expect(normalizeInboundPaymentStatus("weird_status_xyz")).toBeNull();
  });

  it("détecte les terminaux", () => {
    expect(isTerminalPaymentStatus("succeeded")).toBe(true);
    expect(isTerminalPaymentStatus("pending")).toBe(false);
  });

  it("bloque les transitions depuis un terminal sauf refund", () => {
    expect(canTransitionPaymentStatus("failed", "succeeded")).toBe(false);
    expect(canTransitionPaymentStatus("succeeded", "succeeded")).toBe(true);
    expect(canTransitionPaymentStatus("succeeded", "refunded")).toBe(true);
    expect(canTransitionPaymentStatus("pending", "succeeded")).toBe(true);
  });
});
