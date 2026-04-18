/**
 * SharedWorker : connexion Supabase Realtime hors thread principal.
 * Pas d'accès au DOM ; variables globales injectées par Vite (voir vite.config.ts).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Types messages entrants (thread principal → worker) ─────────────────────
export type InboundMessage =
  | { type: "SUBSCRIBE"; orgId: string; token: string }
  | { type: "UNSUBSCRIBE" }
  | { type: "PING" };

// ─── Types messages sortants (worker → thread principal) ─────────────────────
export type WorkerOutboundMessage =
  | { type: "ALERT_INSERT"; payload: unknown }
  | { type: "ALERT_UPDATE"; payload: unknown }
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "ERROR"; message: string }
  | { type: "PONG" };

const ports = new Set<MessagePort>();
let supabase: SupabaseClient | null = null;
let currentOrgId: string | null = null;
let channel: ReturnType<SupabaseClient["channel"]> | null = null;

function broadcast(msg: WorkerOutboundMessage) {
  for (const port of ports) {
    port.postMessage(msg);
  }
}

function teardown() {
  if (channel && supabase) {
    supabase.removeChannel(channel);
    channel = null;
  }
  currentOrgId = null;
}

function subscribe(orgId: string, token: string) {
  if (currentOrgId === orgId && channel) {
    return;
  }

  teardown();

  supabase = createClient(self.SUPABASE_URL, self.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { persistSession: false },
  });

  currentOrgId = orgId;

  channel = supabase
    .channel(`realtime-worker-${orgId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "dashboard_alerts",
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => {
        broadcast({ type: "ALERT_INSERT", payload: payload.new });
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "dashboard_alerts",
        filter: `org_id=eq.${orgId}`,
      },
      (payload) => {
        broadcast({ type: "ALERT_UPDATE", payload: payload.new });
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        broadcast({ type: "CONNECTED" });
      }
      if (status === "CLOSED") {
        broadcast({ type: "DISCONNECTED" });
      }
      if (status === "CHANNEL_ERROR") {
        broadcast({ type: "ERROR", message: "Channel error" });
      }
    });
}

self.addEventListener("connect", (event: Event) => {
  const port = (event as MessageEvent).ports?.[0];
  if (!port) {
    return;
  }
  ports.add(port);

  port.addEventListener("message", (msgEv: MessageEvent<InboundMessage>) => {
    const msg = msgEv.data;
    switch (msg.type) {
      case "SUBSCRIBE":
        subscribe(msg.orgId, msg.token);
        break;
      case "UNSUBSCRIBE":
        teardown();
        break;
      case "PING":
        port.postMessage({ type: "PONG" } satisfies WorkerOutboundMessage);
        break;
      default:
        break;
    }
  });

  port.addEventListener("messageerror", () => {
    ports.delete(port);
    if (ports.size === 0) {
      teardown();
    }
  });

  // Complément au UNSUBSCRIBE explicite côté app : `close` n’est pas garanti sur tous les navigateurs.
  port.addEventListener("close", () => {
    ports.delete(port);
    if (ports.size === 0) {
      teardown();
    }
  });

  port.start();
});

declare const self: SharedWorkerGlobalScope & {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};
