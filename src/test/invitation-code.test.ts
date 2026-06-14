import { describe, expect, it } from "vitest";
import { generateInvitationCode } from "@/lib/invitation-code";

describe("generateInvitationCode", () => {
  it("génère un code au format INV-XXXXXX", () => {
    const code = generateInvitationCode();
    expect(code).toMatch(/^INV-[A-Z2-9]{6}$/);
  });
});
