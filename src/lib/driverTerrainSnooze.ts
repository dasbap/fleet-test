/** Préfixe clé localStorage (v1 = chaîne ISO ; désormais JSON avec compteur). */
export const DRIVER_TERRAIN_SNOOZE_KEY_PREFIX = 'esamba.driver_terrain_snooze_v1_';

export const DRIVER_TERRAIN_SNOOZE_MS = 24 * 60 * 60 * 1000;

/** Nombre maximal de reports « 24 h » avant blocage du bouton. */
export const MAX_DRIVER_TERRAIN_SNOOZE_USES = 3;

export type DriverTerrainSnoozeState = {
  until: number | null;
  /** Nombre de reports déjà effectués (incrémenté à chaque clic). */
  count: number;
};

/**
 * Lit l’état depuis localStorage : JSON `{ until, count }` ou ancienne valeur ISO seule (migration → count = 1).
 */
export function parseDriverTerrainSnoozeStored(raw: string | null): DriverTerrainSnoozeState {
  if (!raw) return { until: null, count: 0 };
  try {
    const j = JSON.parse(raw) as { until?: string; count?: number };
    if (typeof j.until === 'string' && typeof j.count === 'number' && Number.isFinite(j.count)) {
      const t = Date.parse(j.until);
      return {
        until: Number.isNaN(t) ? null : t,
        count: Math.max(0, Math.floor(j.count)),
      };
    }
  } catch {
    // format hérité : chaîne ISO
  }
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return { until: null, count: 0 };
  return { until: t, count: 1 };
}

export function canApplyDriverTerrainSnooze(state: DriverTerrainSnoozeState): boolean {
  return state.count < MAX_DRIVER_TERRAIN_SNOOZE_USES;
}

/** Reports encore possibles avant le prochain clic (0 si plafond atteint). */
export function driverTerrainSnoozeRemaining(state: DriverTerrainSnoozeState): number {
  return Math.max(0, MAX_DRIVER_TERRAIN_SNOOZE_USES - state.count);
}

export function buildDriverTerrainSnoozePayload(
  state: DriverTerrainSnoozeState,
  now: number,
): { payload: string; nextUntil: number } {
  const nextCount = state.count + 1;
  const nextUntil = now + DRIVER_TERRAIN_SNOOZE_MS;
  const payload = JSON.stringify({
    until: new Date(nextUntil).toISOString(),
    count: nextCount,
  });
  return { payload, nextUntil };
}
