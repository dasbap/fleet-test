import { afterEach, describe, expect, it, vi } from "vitest";

import { scheduleDeferredMainThreadWork } from "@/lib/performance/deferredMainThreadWork";

describe("scheduleDeferredMainThreadWork", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("attend le delai puis requestIdleCallback avant d'executer la tache", () => {
    vi.useFakeTimers();
    const task = vi.fn();
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 8 });
      return 42;
    });

    vi.stubGlobal("requestIdleCallback", requestIdleCallback);

    scheduleDeferredMainThreadWork(task, { delayMs: 8_000, idleTimeoutMs: 4_000 });

    vi.advanceTimersByTime(7_999);
    expect(task).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 4_000,
    });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("annule la tache differee", () => {
    vi.useFakeTimers();
    const task = vi.fn();

    const cancel = scheduleDeferredMainThreadWork(task, { delayMs: 8_000 });
    cancel();

    vi.advanceTimersByTime(8_000);

    expect(task).not.toHaveBeenCalled();
  });
});
