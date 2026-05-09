/**
 * useSessionContext.ts — E-Samba
 *
 * Hook principal de contexte de session post-login.
 * Appelle la RPC Supabase `get_user_session_context` en un seul appel
 * et retourne : profil, flottes, route recommandée, flotte active.
 *
 * Usage :
 *   const { context, loading, error } = useSessionContext()
 *   // context.route === 'dashboard' | 'start' | 'auth'
 *   // context.flottes[0].fleet_id, .role, .plan_code, .abo_valid
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlotteContext {
  fleet_id: string;
  fleet_name: string;
  role: "organizer" | "manager" | "driver" | "mechanic";
  org_id: string;
  org_name: string;
  plan_code: string;
  plan_name: string;
  abo_status: string;
  abo_ends_at: string;
  abo_valid: boolean;
  enables_finance: boolean;
  enables_ai: boolean;
  enables_reports: boolean;
  enables_driver_scoring: boolean;
  max_vehicles: number;
}

export interface ProfilContext {
  user_id: string;
  full_name: string;
  phone: string | null;
}

export type SessionRoute = "dashboard" | "start" | "auth" | "loading";

export interface SessionContext {
  route: SessionRoute;
  active_fleet_id: string | null;
  profil: ProfilContext | null;
  flottes: FlotteContext[];
  /** Flotte courante sélectionnée (peut changer via setActiveFleet) */
  currentFleet: FlotteContext | null;
}

const INITIAL: SessionContext = {
  route: "loading",
  active_fleet_id: null,
  profil: null,
  flottes: [],
  currentFleet: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSessionContext() {
  const [context, setContext] = useState<SessionContext>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setContext({ ...INITIAL, route: "auth" });
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "get_user_session_context",
      );

      if (rpcError) throw rpcError;

      const raw = data as {
        route: "dashboard" | "start" | "auth";
        active_fleet_id: string | null;
        profil: ProfilContext | null;
        flottes: FlotteContext[];
      };

      const flottes = raw.flottes ?? [];
      const currentFleet =
        flottes.find((f) => f.fleet_id === raw.active_fleet_id) ??
        flottes[0] ??
        null;

      setContext({
        route: raw.route,
        active_fleet_id: raw.active_fleet_id,
        profil: raw.profil,
        flottes,
        currentFleet,
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Erreur de chargement du contexte";
      setError(message);
      setContext({ ...INITIAL, route: "auth" });
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveFleet = useCallback((fleetId: string) => {
    setContext((prev) => {
      const fleet = prev.flottes.find((f) => f.fleet_id === fleetId) ?? null;
      return { ...prev, active_fleet_id: fleetId, currentFleet: fleet };
    });
  }, []);

  useEffect(() => {
    void fetchContext();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void fetchContext();
      if (event === "SIGNED_OUT")
        setContext({ ...INITIAL, route: "auth" });
    });
    return () => subscription.unsubscribe();
  }, [fetchContext]);

  return { context, loading, error, refetch: fetchContext, setActiveFleet };
}
