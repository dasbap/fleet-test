/**
 * Hook RBAC principal — accès aux permissions et rôles pour l'UI.
 *
 * Source de vérité : RLS Supabase + `rbac_check_permission` côté serveur.
 * Ce hook est une projection côté client (UX aid, pas frontière de sécurité).
 *
 * Usage :
 *   const { can, isAtLeast, isAdmin, hasFleetAccess } = useRoleAccess();
 *   if (!can("vehicle.create")) return <Forbidden />;
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemoSession } from "@/hooks/useDemoSession";
import type { Permission, PlatformRole, RbacCheckResult, RbacContext } from "@/types/rbac";
import {
  buildClientRbacResult,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  roleIsAtLeast,
} from "@/lib/rbac/permissions";

// ─── Types exposés ─────────────────────────────────────────────────────────────

export interface UseRoleAccessReturn {
  /** Contexte RBAC complet (peut être utilisé pour du logging ou debug). */
  rbac: RbacContext;

  /**
   * Vérifie si l'utilisateur a une permission.
   * Retourne toujours false si le contexte n'est pas encore chargé.
   */
  can: (permission: Permission) => boolean;

  /**
   * Vérifie si l'utilisateur a toutes les permissions listées (AND logique).
   */
  canAll: (permissions: Permission[]) => boolean;

  /**
   * Vérifie si l'utilisateur a au moins une des permissions listées (OR logique).
   */
  canAny: (permissions: Permission[]) => boolean;

  /**
   * Vérifie si le rôle effectif est au moins aussi élevé que `minRole`.
   * Hiérarchie : admin > organizer > manager > mechanic > driver
   */
  isAtLeast: (minRole: PlatformRole) => boolean;

  /** True si l'utilisateur est admin plateforme ET non-démo. */
  isAdmin: boolean;

  /**
   * Vérifie si l'utilisateur a accès à une flotte spécifique.
   * Pour l'admin, retourne toujours true.
   * Pour les autres, vérifie si `fleetId` est dans ses `accessibleFleets`.
   */
  hasFleetAccess: (fleetId: string) => boolean;

  /**
   * Construit un `RbacCheckResult` normalisé (utile pour les logs / audit UI).
   */
  checkPermission: (permission: Permission) => RbacCheckResult;

  /** True pendant le chargement initial (admin_profiles query en cours). */
  isLoading: boolean;
}

// ─── Cache admin_profiles (évite une requête par render) ──────────────────────

/**
 * Cache en mémoire pour le statut admin.
 * Clé : userId, valeur : isAdmin.
 * Invalidé sur logout (userId null).
 */
const adminCache = new Map<string, boolean>();

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useRoleAccess(): UseRoleAccessReturn {
  const { user, role: fleetRole, userFleetId, memberships } = useAuth();
  const { isDemo } = useDemoSession();

  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading]             = useState(true);

  // Évite les setState après démontage
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Résolution admin_profiles ────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) {
      // Déconnecté : réinitialiser
      setIsPlatformAdmin(false);
      setIsLoading(false);
      return;
    }

    // Cache hit
    if (adminCache.has(user.id)) {
      const cached = adminCache.get(user.id)!;
      // Un compte démo ne peut jamais être admin, même si la DB le dit
      setIsPlatformAdmin(cached && !isDemo);
      setIsLoading(false);
      return;
    }

    // Requête DB
    setIsLoading(true);

    supabase
      .from("admin_profiles")
      .select("id, is_active")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mountedRef.current) return;

        if (error) {
          // Table inexistante (migration non appliquée) ou RLS → non-admin
          console.warn("[useRoleAccess] admin_profiles inaccessible:", error.message);
          adminCache.set(user.id, false);
          setIsPlatformAdmin(false);
        } else {
          const adminStatus = !!data && !isDemo;
          adminCache.set(user.id, !!data);
          setIsPlatformAdmin(adminStatus);
        }

        setIsLoading(false);
      });
  }, [user?.id, isDemo]);

  // ── Rôle effectif ─────────────────────────────────────────────────────────────

  /**
   * Rôle plateforme résolu :
   * - Si admin confirmé → "admin"
   * - Sinon → rôle flotte actif (AppRole | null)
   */
  const platformRole: PlatformRole | null = isPlatformAdmin
    ? "admin"
    : fleetRole ?? null;

  // ── Flottes accessibles ───────────────────────────────────────────────────────

  const accessibleFleets: string[] = isPlatformAdmin
    ? [] // admin a accès à tout (liste vide = non filtré)
    : memberships
        .filter((m) => m.is_active)
        .map((m) => m.fleet_id);

  // ── Contexte RBAC ─────────────────────────────────────────────────────────────

  const rbac: RbacContext = {
    fleetRole:       fleetRole ?? null,
    platformRole,
    isAdmin:         isPlatformAdmin,
    isDemo,
    accessibleFleets,
  };

  // ── Helpers exposés ───────────────────────────────────────────────────────────

  const can = useCallback(
    (permission: Permission): boolean => {
      if (isLoading) return false;
      return hasPermission(platformRole, permission);
    },
    [platformRole, isLoading],
  );

  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      if (isLoading) return false;
      return hasAllPermissions(platformRole, permissions);
    },
    [platformRole, isLoading],
  );

  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      if (isLoading) return false;
      return hasAnyPermission(platformRole, permissions);
    },
    [platformRole, isLoading],
  );

  const isAtLeast = useCallback(
    (minRole: PlatformRole): boolean => {
      if (isLoading) return false;
      return roleIsAtLeast(platformRole, minRole);
    },
    [platformRole, isLoading],
  );

  const hasFleetAccess = useCallback(
    (fleetId: string): boolean => {
      if (isLoading) return false;
      // L'admin a accès à toutes les flottes (liste vide = non filtré)
      if (isPlatformAdmin) return true;
      return accessibleFleets.includes(fleetId);
    },
    [isPlatformAdmin, accessibleFleets, isLoading],
  );

  const checkPermission = useCallback(
    (permission: Permission): RbacCheckResult => {
      return buildClientRbacResult(platformRole, permission, isDemo);
    },
    [platformRole, isDemo],
  );

  return {
    rbac,
    can,
    canAll,
    canAny,
    isAtLeast,
    isAdmin: isPlatformAdmin,
    hasFleetAccess,
    checkPermission,
    isLoading,
  };
}
