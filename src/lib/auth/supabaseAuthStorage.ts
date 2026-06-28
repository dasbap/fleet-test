import type { SupportedStorage } from "@supabase/supabase-js";
import { isNativePlatform } from "@/lib/platform";

const AUTH_STORAGE_KEY_PREFIX = "sfa_auth_";

function createWebAuthStorage(): SupportedStorage {
  return localStorage;
}

/**
 * Persistance session Supabase via @capacitor/preferences en natif
 * (plus résistant qu'un simple cache WebView).
 */
function createNativeAuthStorage(): SupportedStorage {
  return {
    getItem: async (key: string) => {
      try {
        const { Preferences } = await import("@capacitor/preferences");
        const { value } = await Preferences.get({ key: `${AUTH_STORAGE_KEY_PREFIX}${key}` });
        return value;
      } catch {
        return localStorage.getItem(key);
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.set({ key: `${AUTH_STORAGE_KEY_PREFIX}${key}`, value });
      } catch {
        localStorage.setItem(key, value);
      }
    },
    removeItem: async (key: string) => {
      try {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.remove({ key: `${AUTH_STORAGE_KEY_PREFIX}${key}` });
      } catch {
        localStorage.removeItem(key);
      }
    },
  };
}

export function getSupabaseAuthStorage(): SupportedStorage {
  if (typeof window === "undefined") {
    return localStorage;
  }
  return isNativePlatform() ? createNativeAuthStorage() : createWebAuthStorage();
}
