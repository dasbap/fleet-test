import * as FileSystem from 'expo-file-system';
import type { Tutorial } from './types';
import { mmkvMeta } from '@/storage/mmkv';

const tutorialsDir = `${FileSystem.documentDirectory}tutorials/`;
const completedKey = 'tutorials_completed';

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(tutorialsDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(tutorialsDir, { intermediates: true });
  }
}

export async function getLocalPath(tutorial: Tutorial): Promise<string> {
  return `${tutorialsDir}${tutorial.filename}`;
}

export async function isDownloaded(tutorial: Tutorial): Promise<boolean> {
  const path = await getLocalPath(tutorial);
  const info = await FileSystem.getInfoAsync(path);
  const size = (info as { size?: number }).size ?? 0;
  return info.exists && size > 0;
}

export async function downloadTutorial(
  tutorial: Tutorial,
  onProgress: (progress: number) => void,
): Promise<string> {
  await ensureDir();
  const localPath = await getLocalPath(tutorial);
  const task = FileSystem.createDownloadResumable(
    tutorial.videoUrl,
    localPath,
    {},
    (event) => {
      const ratio = event.totalBytesExpectedToWrite
        ? event.totalBytesWritten / event.totalBytesExpectedToWrite
        : 0;
      onProgress(Math.round(ratio * 100));
    },
  );
  const result = await task.downloadAsync();
  if (!result) {
    throw new Error('Échec du téléchargement du tutoriel.');
  }
  return result.uri;
}

export function getCompletedTutorials(): string[] {
  try {
    const raw = mmkvMeta.getString(completedKey);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markCompleted(id: string) {
  const current = getCompletedTutorials();
  if (!current.includes(id)) {
    mmkvMeta.set(completedKey, JSON.stringify([...current, id]));
  }
}
