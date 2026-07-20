/**
 * Hook React — gestion du compte prospect E-Samba (essai 7 jours).
 *
 * Expose :
 *   - status / daysRemaining / trialEnd
 *   - isExpired / isActive
 *   - canAccess(feature) → restrictions prospect
 *   - refresh()
 *
 * Restrictions prospect (rôle driver sur flotte démo) :
 *   - Pas d'accès finance avancée (billing, rapports financiers)
 *   - Pas d'export massif
 *   - Pas d'accès admin
 *   - Pas de création de véhicules réels
 *   - Pas de gestion multi-flotte
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ProspectDemoRepository } from "@/repositories/prospect-demo.repository";
import { ProspectDemoService } from "@/services/prospect-demo.service";

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Features accessibles ou bloquées pour un prospect. */
export type ProspectFeature =
  | "dashboard"
  | "vehicles_view"
  | "dvir_submit"
  | "maintenance_view"
  | "assignments_own"
  | "reports_basic"
  // Bloquées pour prospect
  | "billing"
  | "reports_export"
  | "reports_advanced"
  | "multi_fleet"
  | "admin_panel"
  | "vehicles_create"
  | "members_manage"
  | "org_settings";

/** Statut du compte prospect. */
export type ProspectStatus =
  | "loading"
  | "not_prospect"   // Utilisateur réel ou compte démo permanent
  | "active"         // Trial en cours
  | "expired"        // Trial terminé, délai de grâce
  | "suspended"      // Compte désactivé après délai de grâce
  | "converted"      // Devenu client payant
  | "error";

export interface ProspectInfo {
  status:       ProspectStatus;
  trialStart:   string | null;
  trialEnd:     string | null;
  daysRemaining: number;
  isExpired:    boolean;
  isActive:     boolean;
  fleetId:      string | null;
}

export interface UseProspectDemoReturn {
  /** True si l'utilisateur est un compte prospect (quel que soit le statut). */
  isProspect: boolean;
  /** Informations détaillées du trial. */
  info:       ProspectInfo;
  /** Vérifie si une feature est accessible pour ce prospect. */
  canAccess:  (feature: ProspectFeature) => boolean;
  /** True pendant le chargement initial. */
  isLoading:  boolean;
  /** Recharge le statut depuis la DB. */
  refresh:    () => Promise<void>;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Features accessibles à un prospect actif (rôle driver sur flotte démo). */
const PROSPECT_ALLOWED_FEATURES = new Set<ProspectFeature>([
  "dashboard",
  "vehicles_view",
  "dvir_submit",
  "maintenance_view",
  "assignments_own",
  "reports_basic",
]);

/** Features bloquées pour tous les prospects (même actifs). */
const PROSPECT_BLOCKED_FEATURES = new Set<ProspectFeature>([
  "billing",
  "reports_export",
  "reports_advanced",
  "multi_fleet",
  "admin_panel",
  "vehicles_create",
  "members_manage",
  "org_settings",
]);

const DEFAULT_INFO: ProspectInfo = {
  status:        "loading",
  trialStart:    null,
  trialEnd:      null,
  daysRemaining: 0,
  isExpired:     false,
  isActive:      false,
  fleetId:       null,
};

const prospectDemoRepository = new ProspectDemoRepository();
const prospectDemoService = new ProspectDemoService(prospectDemoRepository);

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useProspectDemo(): UseProspectDemoReturn {
  const { user } = useAuth();

  const [info, setInfo]         = useState<ProspectInfo>(DEFAULT_INFO);
  const [isLoading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) {
      setInfo({ ...DEFAULT_INFO, status: "not_prospect" });
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const result = await prospectDemoService.getStatus();

      if (!mountedRef.current) return;

      if (!result.ok) {
        if (result.error === "not_a_prospect") {
          setInfo({ ...DEFAULT_INFO, status: "not_prospect" });
        } else {
          setInfo({ ...DEFAULT_INFO, status: "error" });
        }
        setLoading(false);
        return;
      }

      const mappedStatus: ProspectStatus =
        result.status === "active"
          ? "active"
          : result.status === "expired"
            ? "expired"
            : result.status === "suspended"
              ? "suspended"
              : result.status === "converted"
                ? "converted"
                : "error";

      setInfo({
        status: mappedStatus,
        trialStart: result.trial_start ?? null,
        trialEnd: result.trial_end ?? null,
        daysRemaining: result.days_remaining ?? 0,
        isExpired: result.is_expired ?? false,
        isActive: mappedStatus === "active" && !(result.is_expired ?? false),
        fleetId: result.fleet_id ?? null,
      });

      setLoading(false);
    } catch (error) {
      if (!mountedRef.current) return;
      const code = (error as { code?: string }).code;
      if (code === "PGRST202") {
        setInfo({ ...DEFAULT_INFO, status: "not_prospect" });
      } else {
        console.warn("[useProspectDemo] RPC error:", error);
        setInfo({ ...DEFAULT_INFO, status: "error" });
      }
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── canAccess ──────────────────────────────────────────────────────────────

  const canAccess = useCallback(
    (feature: ProspectFeature): boolean => {
      // Non-prospect : pas de restriction via ce hook (géré par useRoleAccess)
      if (info.status === "not_prospect") return true;

      // Compte suspendu ou chargement → tout bloqué
      if (info.status === "suspended" || info.status === "loading") return false;

      // Trial expiré → accès lecture seul (dashboard, vehicles_view)
      if (info.isExpired || info.status === "expired") {
        return feature === "dashboard" || feature === "vehicles_view";
      }

      // Features bloquées pour tout prospect actif
      if (PROSPECT_BLOCKED_FEATURES.has(feature)) return false;

      // Features autorisées
      return PROSPECT_ALLOWED_FEATURES.has(feature);
    },
    [info],
  );

  return {
    isProspect: info.status !== "not_prospect" && info.status !== "loading",
    info,
    canAccess,
    isLoading,
    refresh: load,
  };
}
