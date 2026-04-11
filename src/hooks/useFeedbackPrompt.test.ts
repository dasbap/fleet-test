import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useFeedbackPrompt } from "@/hooks/useFeedbackPrompt";

describe("useFeedbackPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("passe show à true après fire et enregistre le cooldown au dismiss", () => {
    const { result } = renderHook(() =>
      useFeedbackPrompt({
        userId: "user-1",
        fleetId: "fleet-1",
        cooldownMs: 60_000,
      }),
    );

    expect(result.current.show).toBe(false);

    act(() => {
      result.current.fire("manual");
    });
    expect(result.current.show).toBe(true);
    expect(result.current.trigger).toBe("manual");

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.show).toBe(false);

    act(() => {
      result.current.fire("manual");
    });
    expect(result.current.show).toBe(false);
  });

  it("utilise une clé localStorage distincte par flotte", () => {
    const a = renderHook(() =>
      useFeedbackPrompt({ userId: "u", fleetId: "f1", cooldownMs: 60_000 }),
    );
    const b = renderHook(() =>
      useFeedbackPrompt({ userId: "u", fleetId: "f2", cooldownMs: 60_000 }),
    );

    act(() => {
      a.result.current.fire("manual");
    });
    act(() => {
      a.result.current.dismiss();
    });

    act(() => {
      b.result.current.fire("manual");
    });
    expect(b.result.current.show).toBe(true);
  });
});
