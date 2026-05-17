/**
 * useAdminDemoAccounts — hook admin pour gérer les comptes démo E-Samba.
 *
 * Expose :
 *   - sessions      : liste complète enrichie (email, rôle, flotte, expiration, activité)
 *   - isLoading
 *   - reload()
 *   - createAccess(payload)      → crée prospect + magic link
 *   - suspendAccount(userId)     → désactive le compte
 *   - reactivateAccount(userId)  → réactive le compte
 *   - resetFleet(fleetId)        → remet à zéro la flotte démo
 *   - generateMagicLink(userId)  → génère un nouveau lien d'accès
 *   - demoFleets                 → flottes is_demo disponibles
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DemoAccountType = "prospect" | "investor" | "internal" | "dev";
export type DemoRole = "driver" | "manager" | "mechanic" | "organizer";

export interface DemoSession {
  user_id:           string;
  email:             string;
  account_type:      DemoAccountType;
  demo_role:         DemoRole | null;
  is_active:         boolean;
  expires_at:        string | null;
  created_at:        string;
  deactivated_at:    string | null;
  last_login:        string | null;
  notes:             string | null;
  fleet_id:          string | null;
  fleet_name:        string | null;
  magic_link_token:  string | null;
  magic_link_label:  string | null;
  used_count:        number;
  last_used_at:      string | null;
  link_expires_at:   string | null;
  onboarding_steps:  number;
  last_activity_at:  string | null;
}

export interface DemoFleet {
  id:   string;
  name: string;
}

export interface CreateDemoPayload {
  email:        string;
  company_name?: string;
  account_type:  DemoAccountType;
  fleet_id?:    string;
  trial_days:   number;
  label?:       string;
  send_email:   boolean;
}

export interface UseAdminDemoAccountsReturn {
  sessions:       DemoSession[];
  demoFleets:     DemoFleet[];
  isLoading:      boolean;
  reload:         () => Promise<void>;
  createAccess:   (payload: CreateDemoPayload) => Promise<{ ok: boolean; magic_url?: string; error?: string }>;
  suspendAccount: (userId: string) => Promise<boolean>;
  reactivateAccount: (userId: string, extendHours?: number) => Promise<boolean>;
  resetFleet:     (fleetId: string) => Promise<boolean>;
  generateMagicLink: (userId: string, email: string, fleetId: string, label?: string) => Promise<string | null>;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET as string | undefined;

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAdminDemoAccounts(): UseAdminDemoAccountsReturn {
  const [sessions,   setSessions]   = useState<DemoSession[]>([]);
  const [demoFleets, setDemoFleets] = useState<DemoFleet[]>([]);
  const [isLoading,  setLoading]    = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);

    // Sessions
    const { data: sessData, error: sessErr } = await supabase.rpc("admin_list_demo_sessions", {
      p_active_only: false,
    });

    if (sessErr) {
      toast({ title: "Erreur chargement sessions", description: sessErr.message, variant: "destructive" });
    } else {
      setSessions((sessData as DemoSession[]) ?? []);
    }

    // Flottes démo disponibles
    const { data: fleetData } = await supabase
      .from("flottes")
      .select("id, name")
      .eq("is_demo", true)
      .order("name");

    setDemoFleets((fleetData ?? []) as DemoFleet[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  // ── createAccess ────────────────────────────────────────────────────────────

  const createAccess = useCallback(async (payload: CreateDemoPayload) => {
    if (!SUPABASE_URL) return { ok: false, error: "SUPABASE_URL manquant" };
    if (!ADMIN_SECRET) return { ok: false, error: "VITE_ADMIN_SECRET non configuré" };

    try {
      // 1. Créer le compte prospect via Edge Function
      const prospectRes = await fetch(`${SUPABASE_URL}/functions/v1/create-prospect-account`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${ADMIN_SECRET}`,
        },
        body: JSON.stringify({
          email:        payload.email,
          company_name: payload.company_name,
          fleet_id:     payload.fleet_id,
          trial_days:   payload.trial_days,
          send_email:   payload.send_email,
        }),
      });

      const prospectData = await prospectRes.json() as {
        ok: boolean;
        user_id?: string;
        fleet_id?: string;
        error?: string;
      };

      if (!prospectData.ok || !prospectData.user_id) {
        return { ok: false, error: prospectData.error ?? "creation_echouee" };
      }

      // 2. Générer le magic link via Edge Function
      const linkRes = await fetch(`${SUPABASE_URL}/functions/v1/demo-magic-link`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${ADMIN_SECRET}`,
        },
        body: JSON.stringify({
          action:   "create",
          user_id:  prospectData.user_id,
          fleet_id: prospectData.fleet_id ?? payload.fleet_id,
          email:    payload.email,
          label:    payload.label,
        }),
      });

      const linkData = await linkRes.json() as {
        ok: boolean;
        magic_url?: string;
        error?: string;
      };

      await load();

      return {
        ok:        true,
        magic_url: linkData.magic_url,
      };

    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }, [load]);

  // ── suspendAccount ──────────────────────────────────────────────────────────

  const suspendAccount = useCallback(async (userId: string): Promise<boolean> => {
    const { data: meData } = await supabase.auth.getUser();
    const adminId = meData.user?.id ?? "";

    const { data, error } = await supabase.rpc("deactivate_demo_account", {
      p_user_id:        userId,
      p_deactivated_by: adminId,
      p_reason:         "suspension manuelle depuis admin UI",
    });

    if (error || !(data as { ok: boolean })?.ok) {
      toast({ title: "Erreur suspension", description: error?.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Compte suspendu" });
    await load();
    return true;
  }, [load, toast]);

  // ── reactivateAccount ───────────────────────────────────────────────────────

  const reactivateAccount = useCallback(async (userId: string, extendHours?: number): Promise<boolean> => {
    const { data: meData } = await supabase.auth.getUser();
    const adminId = meData.user?.id ?? "";

    const { data, error } = await supabase.rpc("reactivate_demo_account", {
      p_user_id:        userId,
      p_reactivated_by: adminId,
      p_extend_hours:   extendHours ?? null,
    });

    if (error || !(data as { ok: boolean })?.ok) {
      toast({ title: "Erreur réactivation", description: error?.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Compte réactivé" });
    await load();
    return true;
  }, [load, toast]);

  // ── resetFleet ──────────────────────────────────────────────────────────────

  const resetFleet = useCallback(async (fleetId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("admin_reset_demo_fleet", {
      p_fleet_id: fleetId,
    });

    if (error || !(data as { ok: boolean })?.ok) {
      toast({ title: "Erreur reset flotte", description: error?.message, variant: "destructive" });
      return false;
    }

    const res = data as { ok: boolean; vehicles_deleted: number };
    toast({ title: "Flotte réinitialisée", description: `${res.vehicles_deleted} véhicules supprimés` });
    await load();
    return true;
  }, [load, toast]);

  // ── generateMagicLink ───────────────────────────────────────────────────────

  const generateMagicLink = useCallback(async (
    userId: string,
    email: string,
    fleetId: string,
    label?: string,
  ): Promise<string | null> => {
    if (!SUPABASE_URL || !ADMIN_SECRET) return null;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/demo-magic-link`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${ADMIN_SECRET}`,
        },
        body: JSON.stringify({ action: "create", user_id: userId, fleet_id: fleetId, email, label }),
      });

      const data = await res.json() as { ok: boolean; magic_url?: string };
      if (!data.ok) return null;
      await load();
      return data.magic_url ?? null;

    } catch {
      return null;
    }
  }, [load]);

  return {
    sessions,
    demoFleets,
    isLoading,
    reload:            load,
    createAccess,
    suspendAccount,
    reactivateAccount,
    resetFleet,
    generateMagicLink,
  };
}
