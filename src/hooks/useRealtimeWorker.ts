import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkerOutboundMessage } from "@/workers/realtime.worker";

type MessageHandler = (msg: WorkerOutboundMessage) => void;

let workerInstance: SharedWorker | null = null;
let portRef: MessagePort | null = null;
const globalHandlers = new Set<MessageHandler>();
/** Nombre d’abonnés actifs ; à 0 on envoie UNSUBSCRIBE au worker. */
let subscriptionRefCount = 0;

function getWorker(): { port: MessagePort } | null {
  if (typeof SharedWorker === "undefined") {
    return null;
  }

  if (!workerInstance) {
    workerInstance = new SharedWorker(new URL("../workers/realtime.worker.ts", import.meta.url), {
      type: "module",
      name: "esamba-realtime",
    });
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
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  const stableHandler = useCallback<MessageHandler>((msg) => {
    handlerRef.current(msg);
  }, []);

  useEffect(() => {
    if (!orgId) {
      return;
    }

    const workerCtx = getWorker();
    if (!workerCtx) {
      return;
    }

    subscriptionRefCount += 1;
    globalHandlers.add(stableHandler);

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }
      workerCtx.port.postMessage({
        type: "SUBSCRIBE",
        orgId,
        token: session.access_token,
      });
    }

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!session?.access_token) {
        return;
      }
      workerCtx.port.postMessage({
        type: "SUBSCRIBE",
        orgId,
        token: session.access_token,
      });
    });

    return () => {
      globalHandlers.delete(stableHandler);
      subscriptionRefCount -= 1;
      if (subscriptionRefCount <= 0) {
        subscriptionRefCount = 0;
        workerCtx.port.postMessage({ type: "UNSUBSCRIBE" });
      }
      listener.subscription.unsubscribe();
    };
  }, [orgId, stableHandler]);
}
