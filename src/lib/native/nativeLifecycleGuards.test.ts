import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  markNativeExternalActivityFinished,
  markNativeExternalActivityStarted,
  isNativeExternalActivityResumeGraceActive,
} from "@/lib/native/nativeLifecycleGuards";

describe("nativeLifecycleGuards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
  });

  it("garde une periode de grace apres une activite native externe", () => {
    markNativeExternalActivityStarted();

    expect(isNativeExternalActivityResumeGraceActive()).toBe(true);

    vi.setSystemTime(60_000);

    expect(isNativeExternalActivityResumeGraceActive()).toBe(true);

    markNativeExternalActivityFinished();

    expect(isNativeExternalActivityResumeGraceActive()).toBe(true);

    vi.setSystemTime(75_001);

    expect(isNativeExternalActivityResumeGraceActive()).toBe(false);
  });
});
