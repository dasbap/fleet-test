/**
 * Hook React — gestion de la session démo E-Samba.
 *
 * - Init via RPC `demo_upsert_session` au chargement
 * - Countdown expiration (mise à jour toutes les 30 s)
 * - canPerform() : vérifie la policy du rôle côté client
 * - Heartbeat toutes les 15 min pour maintenir la session côté serveur
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  type DemoAction,
  type DemoGuardResult,
  type DemoSession,
  demoCanPerform,
  isSessionExpired,
  sessionMinutesRemaining,
} from "@/lib/demo/demoGuard";

// ─── Types ─────────────────────────────────────────────────────────────────

type DemoStatus =
  | "loading"
  | "not_demo"
  | "active"
  | "session_expired"
  | "account_expired"
  | "error";

export interface UseDemoSessionReturn {
  /** Vrai si l'utilisateur courant est un compte démo. */
  isDemo: boolean;
  /** Statut détaillé de la session démo. */
  status: DemoStatus;
  /** Données de session si active. */
  session: DemoSession | null;
  /** Minutes restantes avant expiration (mis à jour toutes les 30 s). */
  minutesRemaining: number;
  /** Vérifie si une action est autorisée (retourne toujours true pour les non-démo). */
  canPerform: (action: DemoAction) => DemoGuardResult;
  /** Force le rechargement de la session (ex: après une action admin). */
  refresh: () => Promise<void>;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

/** Intervalle de mise à jour du countdown (ms). */
const COUNTDOWN_INTERVAL_MS = 30_000;

/** Intervalle de heartbeat pour `last_seen_at` côté serveur (ms). */
const HEARTBEAT_INTERVAL_MS = 15 * 60_000;

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useDemoSession(): UseDemoSessionReturn {
  const { user } = useAuth();

  const [status, setStatus]             = useState<DemoStatus>("loading");
  const [session, setSession]           = useState<DemoSession | null>(null);
  const [minutesRemaining, setMinutes]  = useState(0);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Init / refresh session ────────────────────────────────────────────────

  const init = useCallback(async () => {
    if (!user?.id) {
      setStatus("not_demo");
      return;
    }

    setStatus("loading");

    const { data, error } = await supabase.rpc("demo_upsert_session", {
      p_ip_address: null,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (error) {
      // Erreur réseau ou RPC inconnue → utilisateur probablement non-démo
      if (error.code === "PGRST202") {
        // RPC introuvable (migration non appliquée en dev)
        setStatus("not_demo");
      } else {
        console.error("[useDemoSession] RPC error:", error.message);
        setStatus("error");
      }
      return;
    }

    if (!data.ok) {
      // Codes retournés par demo_upsert_session
      if (
        data.error === "not_demo_user" ||
        data.error === "no_policy_for_role"
      ) {
        setStatus("not_demo");
      } else if (
        data.error === "demo_account_expired" ||
        data.error === "demo_period_expired"
      ) {
        setStatus("account_expired");
      } else {
        setStatus("error");
      }
      setSession(null);
      return;
    }

    const nextSession: DemoSession = {
      sessionId: data.session_id as string,
      expiresAt: data.expires_at as string,
      fleetId:   data.fleet_id  as string,
      demoRole:  data.demo_role as DemoSession["demoRole"],
      policy:    data.policy    as DemoSession["policy"],
    };

    setSession(nextSession);
    setStatus(isSessionExpired(nextSession) ? "session_expired" : "active");
    setMinutes(sessionMinutesRemaining(nextSession));
  }, [user?.id]);

  // Déclenchement initial + sur changement d'utilisateur
  useEffect(() => {
    void init();
  }, [init]);

  // ── Countdown ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    const tick = (): void => {
      const remaining = sessionMinutesRemaining(session);
      setMinutes(remaining);

      if (remaining === 0 && status === "active") {
        setStatus("session_expired");
      }
    };

    tick(); // appel immédiat
    countdownRef.current = setInterval(tick, COUNTDOWN_INTERVAL_MS);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [session, status]);

  // ── Heartbeat (last_seen_at côté serveur) ─────────────────────────────────

  useEffect(() => {
    if (status !== "active" || !session) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    const beat = async (): Promise<void> => {
      // Un simple appel demo_upsert_session met à jour last_seen_at
      const { data } = await supabase.rpc("demo_upsert_session", {
        p_ip_address: null,
        p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });

      // Si la session a expiré entre deux heartbeats, mettre à jour l'état
      if (data && !data.ok && data.error?.includes("expired")) {
        setStatus("session_expired");
        setSession(null);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      }
    };

    heartbeatRef.current = setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [status, session]);

  // ── canPerform ────────────────────────────────────────────────────────────

  const canPerform = useCallback(
    (action: DemoAction): DemoGuardResult => {
      if (status === "not_demo") return { allowed: true };
      return demoCanPerform(session, action);
    },
    [session, status],
  );

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    isDemo: status !== "not_demo" && status !== "loading",
    status,
    session,
    minutesRemaining,
    canPerform,
    refresh: init,
  };
}
