const MS_PER_DAY = 86_400_000;

/** Jours calendaires restants avant une date ISO (référence `nowMs` fournie). */
export function daysUntil(isoDate: string, nowMs: number): number {
  return Math.ceil((new Date(isoDate).getTime() - nowMs) / MS_PER_DAY);
}
