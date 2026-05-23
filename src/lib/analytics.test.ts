import { beforeEach, describe, expect, it, vi } from "vitest";

const captureMock = vi.fn();
const identifyMock = vi.fn();
const resetMock = vi.fn();
const registerMock = vi.fn();
const initMock = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    capture: captureMock,
    identify: identifyMock,
    reset: resetMock,
    register: registerMock,
    init: initMock,
  },
}));

vi.mock("@/lib/platform", () => ({
  isNativePlatform: () => false,
}));

vi.mock("@/i18n", () => ({
  default: {
    language: "sw",
  },
}));

describe("analytics PostHog", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("ajoute la langue dans track()", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "ph_test_key");
    const analyticsModule = await import("@/lib/analytics");

    analyticsModule.initAnalytics();
    await vi.waitFor(async () => {
      await Promise.resolve();
      analyticsModule.track("search_performed", { result_count: 3 });
      expect(captureMock).toHaveBeenCalled();
    });

    expect(captureMock).toHaveBeenCalledWith(
      "search_performed",
      expect.objectContaining({
        result_count: 3,
        lang: "sw",
      })
    );
  });

  it("conserve la langue dans le pageview", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "ph_test_key");
    const analyticsModule = await import("@/lib/analytics");
    vi.stubGlobal("window", {
      location: { href: "https://example.test/dashboard" },
    } as Window & typeof globalThis);

    analyticsModule.initAnalytics();
    await vi.waitFor(async () => {
      await Promise.resolve();
      analyticsModule.capturePageview();
      expect(captureMock).toHaveBeenCalled();
    });

    expect(captureMock).toHaveBeenCalledWith(
      "$pageview",
      expect.objectContaining({
        $current_url: "https://example.test/dashboard",
        lang: "sw",
      })
    );
  });
});
