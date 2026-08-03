import { describe, expect, it } from "vitest";
import { DEMO_MAGIC_LINK_ENABLED } from "@/lib/demo/demoFeatureFlag";

describe("demo feature flags", () => {
  it("garde les magic links demo routables meme si l'UI demo publique est masquee", () => {
    expect(DEMO_MAGIC_LINK_ENABLED).toBe(true);
  });
});
