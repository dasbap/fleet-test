/**
 * Diagnostic dev : Long Tasks et interactions lentes (INP approximatif).
 * Ne pas activer en production.
 */
const LONG_TASK_DEBUG_THRESHOLD_MS = 50;
const LONG_TASK_WARN_THRESHOLD_MS = 100;
const INP_WARN_THRESHOLD_MS = 200;
const EVENT_REPORT_COOLDOWN_MS = 5_000;
const DRAG_EVENT_NAMES = new Set(["dragstart", "drag", "dragover", "dragenter", "dragleave", "drop"]);

const lastEventReportByName = new Map<string, number>();

function shouldReportEvent(name: string, now: number): boolean {
  const lastReport = lastEventReportByName.get(name) ?? 0;
  if (now - lastReport < EVENT_REPORT_COOLDOWN_MS) {
    return false;
  }
  lastEventReportByName.set(name, now);
  return true;
}

export function measureINP(): () => void {
  if (typeof PerformanceObserver === "undefined") {
    return () => {};
  }

  const cleanups: Array<() => void> = [];

  try {
    const longTaskObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = Math.round(entry.duration);
        if (duration >= LONG_TASK_WARN_THRESHOLD_MS) {
          console.warn(
            `[INP] Long Task: ${duration}ms — vérifier le rendu, les imports lazy et le déport Realtime (worker)`,
            entry,
          );
        } else if (duration >= LONG_TASK_DEBUG_THRESHOLD_MS) {
          console.debug(`[INP] Long Task mineure: ${duration}ms`, entry);
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
        if (timing.duration > INP_WARN_THRESHOLD_MS) {
          const duration = Math.round(timing.duration);
          if (!shouldReportEvent(timing.name, performance.now())) {
            continue;
          }

          if (DRAG_EVENT_NAMES.has(timing.name)) {
            console.debug(
              `[INP] Interaction drag lente ignoree: ${duration}ms sur "${timing.name}" (diagnostic dev)`,
            );
          } else {
            console.warn(
              `[INP] Interaction lente: ${duration}ms sur "${timing.name}" (seuil indicatif ${INP_WARN_THRESHOLD_MS}ms)`,
            );
          }
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
    lastEventReportByName.clear();
  };
}
