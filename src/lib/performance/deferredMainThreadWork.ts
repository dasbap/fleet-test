type IdleCallbackHandle = number;

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

export interface DeferredMainThreadWorkOptions {
  delayMs?: number;
  idleTimeoutMs?: number;
}

export function scheduleDeferredMainThreadWork(
  task: () => void,
  { delayMs = 0, idleTimeoutMs = 3_000 }: DeferredMainThreadWorkOptions = {},
): () => void {
  let cancelled = false;
  let idleHandle: IdleCallbackHandle | null = null;
  const win = window as WindowWithIdleCallback;

  const runWhenIdle = () => {
    if (cancelled) return;

    if (typeof win.requestIdleCallback === "function") {
      idleHandle = win.requestIdleCallback(
        () => {
          if (!cancelled) task();
        },
        { timeout: idleTimeoutMs },
      );
      return;
    }

    window.setTimeout(() => {
      if (!cancelled) task();
    }, 0);
  };

  const timeoutHandle = window.setTimeout(runWhenIdle, delayMs);

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutHandle);
    if (idleHandle != null && typeof win.cancelIdleCallback === "function") {
      win.cancelIdleCallback(idleHandle);
    }
  };
}
