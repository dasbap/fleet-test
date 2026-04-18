/**
 * Diagnostic dev : Long Tasks et interactions lentes (INP approximatif).
 * Ne pas activer en production.
 */
export function measureINP(): () => void {
  if (typeof PerformanceObserver === "undefined") {
    return () => {};
  }

  const cleanups: Array<() => void> = [];

  try {
    const longTaskObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn(
            `[INP] Long Task: ${Math.round(entry.duration)}ms — vérifier le déport Realtime (worker)`,
            entry,
          );
        }
      }
    });
    longTaskObs.observe({ type: "longtask", buffered: true });
    cleanups.push(() => longTaskObs.disconnect());
  } catch {
    /* API longtask non supportée (ex. Firefox) */
  }

  try {
    const inpObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const timing = entry as PerformanceEventTiming;
        if (timing.duration > 200) {
          console.error(
            `[INP] Interaction lente: ${Math.round(timing.duration)}ms sur "${timing.name}" (seuil indicatif 200ms)`,
          );
        }
      }
    });
    inpObs.observe({ type: "event", durationThreshold: 100, buffered: true } as PerformanceObserverInit);
    cleanups.push(() => inpObs.disconnect());
  } catch {
    /* event timing optionnel */
  }

  return () => {
    for (const fn of cleanups) {
      fn();
    }
  };
}
