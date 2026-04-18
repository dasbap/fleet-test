import type { Tutorial } from './types';

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m${rest > 0 ? `${rest}s` : ''}` : `${rest}s`;
}

export function getNextTutorial(list: Tutorial[], currentId: string): Tutorial | null {
  const index = list.findIndex((tutorial) => tutorial.id === currentId);
  if (index < 0 || index >= list.length - 1) {
    return null;
  }
  return list[index + 1];
}
