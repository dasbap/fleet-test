import { isNativePlatform } from "@/lib/platform";

export interface NetworkState {
  isOnline: boolean;
  connectionType: string;
  isSlowConnection: boolean;
}

type NetworkListener = (state: NetworkState) => void;

let cachedState: NetworkState = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  connectionType: "unknown",
  isSlowConnection: false,
};

const listeners = new Set<NetworkListener>();
let initialized = false;

function notify(): void {
  for (const listener of listeners) {
    listener(cachedState);
  }
}

function deriveSlowConnection(type: string, effectiveType?: string): boolean {
  const t = (effectiveType ?? type).toLowerCase();
  return t === "2g" || t === "slow-2g" || t === "3g";
}

async function initNativeNetwork(): Promise<void> {
  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    cachedState = {
      isOnline: status.connected,
      connectionType: status.connectionType,
      isSlowConnection: deriveSlowConnection(status.connectionType),
    };
    await Network.addListener("networkStatusChange", (status) => {
      cachedState = {
        isOnline: status.connected,
        connectionType: status.connectionType,
        isSlowConnection: deriveSlowConnection(status.connectionType),
      };
      notify();
    });
  } catch {
    // Fallback navigateur ci-dessous
  }
}

function initBrowserNetwork(): void {
  if (typeof window === "undefined") return;

  const refresh = () => {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } })
      .connection;
    cachedState = {
      isOnline: navigator.onLine,
      connectionType: conn?.effectiveType ?? "unknown",
      isSlowConnection: deriveSlowConnection("unknown", conn?.effectiveType),
    };
    notify();
  };

  window.addEventListener("online", refresh);
  window.addEventListener("offline", refresh);
  refresh();
}

/**
 * Initialise la détection réseau (Capacitor Network ou fallback navigateur).
 */
export async function initNetworkStatus(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (isNativePlatform()) {
    await initNativeNetwork();
  }
  initBrowserNetwork();
}

/** État réseau courant (préfère Capacitor Network en natif). */
export function getNetworkState(): NetworkState {
  return cachedState;
}

/** True si l'app considère être en ligne pour la sync. */
export function isNetworkOnline(): boolean {
  return cachedState.isOnline;
}

/** True si hors ligne (inverse fiable pour enqueue terrain). */
export function isOfflineMode(): boolean {
  return !cachedState.isOnline;
}

export function subscribeNetworkStatus(listener: NetworkListener): () => void {
  listeners.add(listener);
  listener(cachedState);
  return () => listeners.delete(listener);
}
