import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { WorkerOutboundMessage } from "@/workers/realtime.worker";

type MessageHandler = (msg: WorkerOutboundMessage) => void;

let workerInstance: SharedWorker | null = null;
let portRef: MessagePort | null = null;
const globalHandlers = new Set<MessageHandler>();
/** Nombre d'abonnés actifs ; à 0 on envoie UNSUBSCRIBE au worker. */
let subscriptionRefCount = 0;
/** Empreinte alignée sur le build Vite du worker (`define` sur `self`). */
let boundFingerprint: string | null = null;
let warnedConfigDrift = false;

/** Empreinte de la config Supabase côté client (même source que le bundle worker). */
function envFingerprint(): string {
  return `${String(import.meta.env.VITE_SUPABASE_URL ?? "")}\u0000${String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")}`;
}

function fnv1a32Hex(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * URL du script avec paramètre stable : force une instance SharedWorker distincte
 * quand l'empreinte change (ex. HMR) sans mettre les clés dans `name`.
 */
function workerScriptUrlForFingerprint(fp: string): URL {
  const u = new URL("../workers/realtime.worker.ts", import.meta.url);
  u.searchParams.set("_env", fnv1a32Hex(fp));
  return u;
}

function disposeWorkerConnection(): void {
  try {
    portRef?.postMessage({ type: "UNSUBSCRIBE" });
  } catch {
    /* port déjà fermé */
  }
  try {
    portRef?.close();
  } catch {
    /* idem */
  }
  workerInstance = null;
  portRef = null;
  boundFingerprint = null;
}

function getWorker(): { port: MessagePort } | null {
  if (typeof SharedWorker === "undefined") {
    return null;
  }

  const fp = envFingerprint();

  if (workerInstance && boundFingerprint !== fp) {
    if (subscriptionRefCount > 0) {
      if (!warnedConfigDrift) {
        console.warn(
          "[RealtimeWorker] La configuration Supabase a changé ; le worker sera recréé lorsque tous les abonnements seront relâchés.",
        );
        warnedConfigDrift = true;
      }
    } else {
      disposeWorkerConnection();
    }
  }

  if (!workerInstance) {
    workerInstance = new SharedWorker(workerScriptUrlForFingerprint(fp), {
      type: "module",
      name: "esamba-realtime",
    });
    boundFingerprint = fp;
    warnedConfigDrift = false;
    portRef = workerInstance.port;
    portRef.start();

    portRef.onmessage = (e: MessageEvent<WorkerOutboundMessage>) => {
      for (const handler of globalHandlers) {
        handler(e.data);
      }
    };

    portRef.onmessageerror = (e) => {
      console.error("[RealtimeWorker] message error", e);
    };
  }

  return { port: portRef! };
}

export interface UseRealtimeWorkerOptions {
  orgId: string | null;
  onMessage: MessageHandler;
}

export function useRealtimeWorker({ orgId, onMessage }: UseRealtimeWorkerOptions) {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  const stableHandler = useCallback<MessageHandler>((msg) => {
    handlerRef.current(msg);
  }, []);

  useEffect(() => {
    if (!orgId || !accessToken) {
      return;
    }

    const workerCtx = getWorker();
    if (!workerCtx) {
      return;
    }

    subscriptionRefCount += 1;
    globalHandlers.add(stableHandler);

    workerCtx.port.postMessage({
      type: "SUBSCRIBE",
      orgId,
      token: accessToken,
    });

    return () => {
      globalHandlers.delete(stableHandler);
      subscriptionRefCount -= 1;
      if (subscriptionRefCount <= 0) {
        subscriptionRefCount = 0;
        try {
          workerCtx.port.postMessage({ type: "UNSUBSCRIBE" });
        } catch {
          /* port fermé */
        }
        // Recréation différée si l'empreinte a changé pendant la vie des abonnements (ex. HMR).
        if (boundFingerprint !== null && boundFingerprint !== envFingerprint()) {
          disposeWorkerConnection();
        }
      }
    };
  }, [orgId, accessToken, stableHandler]);
}

/**
 * Réinitialise le singleton (Vitest uniquement) pour isoler les scénarios de ref-count.
 */
export function resetRealtimeWorkerForTests(): void {
  if (import.meta.env.MODE !== "test") {
    throw new Error("resetRealtimeWorkerForTests: réservé aux tests");
  }
  disposeWorkerConnection();
  subscriptionRefCount = 0;
  globalHandlers.clear();
  warnedConfigDrift = false;
}
