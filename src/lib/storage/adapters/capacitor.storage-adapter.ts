import type { StorageAdapter } from "@/lib/storage/adapters/storage-adapter.interface";

let preferences: typeof import("@capacitor/preferences") | null = null;

async function ensurePreferences() {
  if (preferences) return preferences;
  try {
    const mod = await import("@capacitor/preferences");
    preferences = mod;
    return mod;
  } catch {
    throw new Error("Capacitor Preferences non disponible dans cet environnement.");
  }
}

export class CapacitorStorageAdapter implements StorageAdapter {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const prefs = await ensurePreferences();
      const { value } = await prefs.Preferences.get({ key });
      if (!value) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const prefs = await ensurePreferences();
    const payload = JSON.stringify(value);
    await prefs.Preferences.set({ key, value: payload });
  }

  async removeItem(key: string): Promise<void> {
    const prefs = await ensurePreferences();
    await prefs.Preferences.remove({ key });
  }
}

