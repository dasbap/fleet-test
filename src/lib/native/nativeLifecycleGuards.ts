const DEFAULT_RESUME_GRACE_MS = 15_000;

let nativeExternalActivityInProgress = false;
let nativeExternalActivityFinishedAt = 0;

export function markNativeExternalActivityStarted(): void {
  nativeExternalActivityInProgress = true;
}

export function markNativeExternalActivityFinished(nowMs = Date.now()): void {
  nativeExternalActivityInProgress = false;
  nativeExternalActivityFinishedAt = nowMs;
}

export function isNativeExternalActivityResumeGraceActive(
  nowMs = Date.now(),
  graceMs = DEFAULT_RESUME_GRACE_MS,
): boolean {
  if (nativeExternalActivityInProgress) return true;
  if (nativeExternalActivityFinishedAt <= 0) return false;
  return nowMs - nativeExternalActivityFinishedAt <= graceMs;
}
