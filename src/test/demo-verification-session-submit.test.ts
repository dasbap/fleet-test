import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("demo verification submit session", () => {
  it("uses the current Supabase verification session at submit time", () => {
    const source = readFileSync(
      "src/components/landing/ContactDemoForm.tsx",
      "utf8",
    );

    expect(source).toContain("await demoVerificationSupabase.auth.getSession()");
    expect(source).toContain("isMatchingVerifiedDemoSession(session, normalizedEmail)");
    expect(source).toContain("emailVerificationToken: session.access_token");
    expect(source).not.toContain("useState(\"\")\n  const [verificationPending");
    expect(source).not.toContain("setEmailVerificationToken");
  });
});
