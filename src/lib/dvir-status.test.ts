import { describe, expect, it } from "vitest";
import { computeOverallDvirStatus } from "@/lib/dvir-status";

describe("computeOverallDvirStatus", () => {
  it("renvoie ok sans défaut", () => {
    expect(
      computeOverallDvirStatus({
        freins_service: { status: "ok" },
        klaxon: { status: "na" },
      }),
    ).toBe("ok");
  });

  it("renvoie unsafe sur défaut critique", () => {
    expect(
      computeOverallDvirStatus({
        freins_service: { status: "defaut" },
        klaxon: { status: "ok" },
      }),
    ).toBe("unsafe");
  });

  it("renvoie minor_issues sur défaut non critique", () => {
    expect(
      computeOverallDvirStatus({
        freins_service: { status: "ok" },
        klaxon: { status: "defect" },
      }),
    ).toBe("minor_issues");
  });
});
