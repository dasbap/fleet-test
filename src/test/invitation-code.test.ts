import { describe, expect, it } from "vitest";
import { generateInvitationCode } from "@/lib/invitation-code";

describe("generateInvitationCode", () => {
  it("génère un code CSPRNG au format INV-XXXXXXXXXX", () => {
    const code = generateInvitationCode();
    expect(code).toMatch(/^INV-[A-HJ-KM-NP-Z2-9]{10}$/);
  });

  it("ne réutilise pas systématiquement le même code", () => {
    const codes = new Set(Array.from({ length: 32 }, () => generateInvitationCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
