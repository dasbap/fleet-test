import { deepLinkLogDebug } from "@/lib/deepLinks/deepLinkLogger";

const STORAGE_KEY = "esamba.pendingDeepLink";

/**
 * File d’attente légère (session) pour les scénarios où la navigation doit attendre
 * (ex. plugin push livré avant le montage du routeur — à consommer une fois prêt).
 */
export function queuePendingDeepLink(path: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
    deepLinkLogDebug("Deep link mis en file d’attente", { path });
  } catch {
    /* quota / privé */
  }
}

export function peekPendingDeepLink(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function consumePendingDeepLink(): string | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v) sessionStorage.removeItem(STORAGE_KEY);
    return v;
  } catch {
    return null;
  }
}
