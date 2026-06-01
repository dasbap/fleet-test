/**
 * Politiques de refetch adaptées réseau Afrique (3G, saveData, onglet caché).
 */

export function isSlowOrMeteredConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } })
    .connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  const t = conn.effectiveType;
  return t === "slow-2g" || t === "2g" || t === "3g";
}

/** Intervalle de polling : plus long sur connexion lente ou onglet caché. */
export function refetchIntervalWhenVisible(visibleMs: number, hiddenMs = visibleMs * 3): number {
  if (typeof document === "undefined") return visibleMs;
  const base = document.visibilityState === "hidden" ? hiddenMs : visibleMs;
  return isSlowOrMeteredConnection() ? base * 2 : base;
}

/** staleTime dashboard : 2 min réseau rapide, 5 min sur 3G / saveData. */
export function dashboardStaleTimeMs(): number {
  return isSlowOrMeteredConnection() ? 5 * 60_000 : 2 * 60_000;
}
