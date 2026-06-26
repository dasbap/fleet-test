import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { pollUntil } from "@/lib/pollUntil";

describe("pollUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retourne true immédiatement si la condition est déjà vraie", async () => {
    const condition = vi.fn().mockResolvedValue(true);

    const promise = pollUntil(condition, { timeout: 1000, interval: 100 });
    await expect(promise).resolves.toBe(true);
    expect(condition).toHaveBeenCalledTimes(1);
  });

  it("réessaie jusqu'à succès", async () => {
    const condition = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const promise = pollUntil(condition, { timeout: 2000, interval: 500 });

    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toBe(true);
    expect(condition).toHaveBeenCalledTimes(3);
  });

  it("retourne false après expiration du délai", async () => {
    const condition = vi.fn().mockResolvedValue(false);

    const promise = pollUntil(condition, { timeout: 1000, interval: 200 });
    await vi.advanceTimersByTimeAsync(1200);
    await expect(promise).resolves.toBe(false);
    expect(condition.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
