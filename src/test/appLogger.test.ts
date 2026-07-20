import { afterEach, describe, expect, it, vi } from "vitest";
import { logDebug, logError, logInfo, logWarn } from "@/lib/logging/appLogger";

describe("appLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logError écrit sur console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("Échec test", new Error("x"));
    expect(spy).toHaveBeenCalled();
  });

  it("logInfo écrit sur console.info avec le préfixe applicatif", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logInfo("Info test");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[Flotte E-Samba] Info test"));
  });

  it("logWarn écrit sur console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logWarn("Attention");
    expect(spy).toHaveBeenCalled();
  });

  it("logDebug n’écrit que si import.meta.env.DEV est true", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    logDebug("Debug");
    if (import.meta.env.DEV) {
      expect(spy).toHaveBeenCalled();
    } else {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it("logError avec source error-boundary ne lève pas", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      logError("Boundary", new Error("e"), {
        source: "error-boundary",
        componentStack: "stack",
        eventId: "evt",
      })
    ).not.toThrow();
  });
});
