/**
 * Accès générique au localStorage (JSON), sécurisé SSR / WebView.
 */

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function storageGet<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null || raw === "") return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function storageSet<T>(key: string, value: T): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[localStorage] Écriture impossible:", key, e);
  }
}

export function storageRemove(key: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    console.error("[localStorage] Suppression impossible:", key, e);
  }
}

/** Supprime toutes les clés dont le préfixe correspond (ex. reset ou tests). */
export function storageRemoveByPrefix(prefix: string): void {
  if (!canUseStorage()) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch (e) {
    console.error("[localStorage] purge préfixe impossible:", e);
  }
}
