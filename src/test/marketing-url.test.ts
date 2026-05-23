import { describe, it, expect, vi, afterEach } from "vitest";
import { getMarketingBaseUrl, getMarketingUrl } from "@/lib/marketing-url";

describe("marketing-url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("utilise la valeur par défaut sans VITE_MARKETING_URL", () => {
    vi.stubEnv("VITE_MARKETING_URL", "");
    expect(getMarketingBaseUrl()).toBe("https://marketing.e-samba.com");
    expect(getMarketingUrl("/guides")).toBe(
      "https://marketing.e-samba.com/guides"
    );
  });

  it("normalise le slash final de la base", () => {
    vi.stubEnv("VITE_MARKETING_URL", "https://www.e-samba.com/");
    expect(getMarketingUrl("/guides")).toBe("https://www.e-samba.com/guides");
  });
});
