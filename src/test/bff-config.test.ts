import { afterEach, describe, expect, it, vi } from "vitest";

describe("bff-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retourne undefined sans BFF configuré", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_DEV_BFF_PROXY", "");
    const { getBffBaseUrl, isBffConfigured } = await import("@/lib/bff-config");
    expect(getBffBaseUrl()).toBeUndefined();
    expect(isBffConfigured()).toBe(false);
  });

  it("retourne chaîne vide en mode proxy dev", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_DEV_BFF_PROXY", "true");
    vi.resetModules();
    const { getBffBaseUrl, isBffConfigured } = await import("@/lib/bff-config");
    expect(getBffBaseUrl()).toBe("");
    expect(isBffConfigured()).toBe(true);
  });

  it("normalise l’URL prod api.e-samba.com", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.e-samba.com/");
    vi.stubEnv("VITE_DEV_BFF_PROXY", "");
    vi.resetModules();
    const { getBffBaseUrl } = await import("@/lib/bff-config");
    expect(getBffBaseUrl()).toBe("https://api.e-samba.com");
  });
});
