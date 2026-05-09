import { describe, expect, it } from 'vitest';
import {
  buildDriverTerrainSnoozePayload,
  canApplyDriverTerrainSnooze,
  driverTerrainSnoozeRemaining,
  MAX_DRIVER_TERRAIN_SNOOZE_USES,
  parseDriverTerrainSnoozeStored,
} from './driverTerrainSnooze';

describe('driverTerrainSnooze', () => {
  it('vide → pas de date, compteur 0', () => {
    expect(parseDriverTerrainSnoozeStored(null)).toEqual({ until: null, count: 0 });
  });

  it('hérité ISO seul → until parsé, count 1', () => {
    const iso = '2026-04-20T12:00:00.000Z';
    const s = parseDriverTerrainSnoozeStored(iso);
    expect(s.until).toBe(Date.parse(iso));
    expect(s.count).toBe(1);
  });

  it('JSON valide → until et count', () => {
    const iso = '2026-04-21T08:00:00.000Z';
    const raw = JSON.stringify({ until: iso, count: 2 });
    expect(parseDriverTerrainSnoozeStored(raw)).toEqual({
      until: Date.parse(iso),
      count: 2,
    });
  });

  it('refuse le report si count >= max', () => {
    expect(canApplyDriverTerrainSnooze({ until: null, count: MAX_DRIVER_TERRAIN_SNOOZE_USES })).toBe(
      false,
    );
    expect(canApplyDriverTerrainSnooze({ until: null, count: MAX_DRIVER_TERRAIN_SNOOZE_USES - 1 })).toBe(
      true,
    );
  });

  it('remaining = max - count', () => {
    expect(driverTerrainSnoozeRemaining({ until: null, count: 0 })).toBe(MAX_DRIVER_TERRAIN_SNOOZE_USES);
    expect(driverTerrainSnoozeRemaining({ until: null, count: 2 })).toBe(1);
    expect(driverTerrainSnoozeRemaining({ until: null, count: 3 })).toBe(0);
  });

  it('buildDriverTerrainSnoozePayload incrémente et sérialise', () => {
    const now = 1_700_000_000_000;
    const { payload, nextUntil } = buildDriverTerrainSnoozePayload({ until: null, count: 1 }, now);
    const parsed = parseDriverTerrainSnoozeStored(payload);
    expect(parsed.count).toBe(2);
    expect(parsed.until).toBe(nextUntil);
  });
});
