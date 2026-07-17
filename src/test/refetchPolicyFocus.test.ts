import { describe, expect, it } from "vitest";

import { shouldRefetchOnWindowFocus } from "@/lib/query/refetchPolicy";

describe("refetch policy focus", () => {
  it("ne relance pas les requetes au retour de focus navigateur", () => {
    expect(shouldRefetchOnWindowFocus()).toBe(false);
  });
});
