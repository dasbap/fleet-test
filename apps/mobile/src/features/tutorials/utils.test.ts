import { describe, expect, it } from 'vitest';
import { tutorials } from './catalog';
import { formatDuration, getNextTutorial } from './utils';

describe('tutorial utils', () => {
  it('formate la durée correctement', () => {
    expect(formatDuration(64)).toBe('1m4s');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(9)).toBe('9s');
  });

  it('retourne le tutoriel suivant et gère la fin de liste', () => {
    expect(getNextTutorial(tutorials, 'tuto-01')?.id).toBe('tuto-02');
    expect(getNextTutorial(tutorials, 'tuto-10')).toBeNull();
  });
});
