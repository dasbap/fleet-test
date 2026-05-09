import { describe, it, expect } from "vitest";
import type { Alert } from "@/hooks/useAlerts";

describe("alert list basic shape", () => {
  it("Alert type should expose type / severity / status fields", () => {
    const sample: Pick<Alert, "type" | "severity" | "status"> = {
      type: "missing_closure",
      severity: "critical",
      status: "open",
    };

    expect(sample.type).toBe("missing_closure");
    expect(sample.severity).toBe("critical");
    expect(sample.status).toBe("open");
  });
});

