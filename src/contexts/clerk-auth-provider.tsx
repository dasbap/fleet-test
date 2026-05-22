/**
 * ClerkAuthProvider — fournisseur d'auth basé sur Clerk.
 *
 * Remplace SupabaseAuthProvider quand VITE_AUTH_PROVIDER=clerk.
 * Implémente la même interface AuthContextValue pour que le reste de l'app
 * soit inchangé (ProtectedRoute, useAuth, hooks métier).
 *
 * Prérequis (une fois, dans les dashboards) :
 *   - Clerk : JWT template "supabase" avec signing key = Supabase JWT secret
 *   - Supabase : fonction clerk_sub() + policies RLS duales (migration ci-dessous)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { createClerkSupabaseClient } from "@/integrations/supabase/clerk-client";
import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";
import type { AppRole, AuthUser, FleetMembership } from "@/types/auth";
import { isValidUuid } from "@/lib/isUuid";
import {
  clearLocalSessionSnapshot,
  setLocalSessionSnapshot,
} from "@/lib/storage/flotteEsambaLocalCache";

const ACTIVE_FLEET_KEY = "esamba.active_fleet_id";

const ROLE_HIERARCHY: AppRole[] = ["organizer", "manager", "mechanic", "driver"];

function highestRole(roles: AppRole[]): AppRole {
  return ROLE_HIERARCHY.find((r) => roles.includes(r)) ?? "driver";
}

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: userLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  // ── État auth ────────────────────────────────────────────────────────────
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<FleetMembership[]>([]);
  const [role, setRole] = useState<AppRole | null>(null);
  const [activeFleetId, setActiveFleetIdRaw] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tenantOptions, setTenantOptions] = useState<
    { orgId: string; fleetId: string; fleetName: string | null; role: AppRole }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTenantOrgLoading, setIsTenantOrgLoading] = useState(false);

  // ── Reset quand déconnexion ──────────────────────────────────────────────
  useEffect(() => {
    if (!userLoaded) return;
    if (!isSignedIn) {
      setSupabaseUserId(null);
      setMemberships([]);
      setRole(null);
      setActiveFleetIdRaw(null);
      setOrgId(null);
      setTenantOptions([]);
      setIsLoading(false);
      clearLocalSessionSnapshot();
    }
  }, [userLoaded, isSignedIn]);

  // ── Chargement profil + adhésions depuis Supabase ─────────────────────
  const loadUserData = useCallback(async () => {
    if (!clerkUser || !isSignedIn) return;

    setIsLoading(true);
    setIsTenantOrgLoading(true);

    try {
      // Créer un client Supabase authentifié avec le JWT Clerk
      const client = await createClerkSupabaseClient(getToken);

      // 1. Trouver le profil Supabase via clerk_user_id (policy RLS dédiée)
      //    Si introuvable au premier essai, on poll jusqu'à 5s (race condition webhook Clerk).
      const fetchProfil = () =>
        client
          .from("profils")
          .select("user_id, full_name, phone")
          .eq("clerk_user_id", clerkUser.id)
          .single();

      let profilResult = await fetchProfil();

      if (profilResult.error || !profilResult.data?.user_id) {
        // Profil pas encore créé par le webhook Clerk — polling 500ms × 10 = 5s max
        const POLL_INTERVAL_MS = 500;
        const POLL_MAX_ATTEMPTS = 10;

        for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
          await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
          profilResult = await fetchProfil();
          if (!profilResult.error && profilResult.data?.user_id) break;
        }
      }

      if (profilResult.error || !profilResult.data?.user_id) {
        // Webhook toujours pas reçu après 5s → état vide, l'utilisateur verra l'onboarding
        console.warn("[ClerkAuth] Profil introuvable après polling — webhook Clerk en retard ?");
        setIsLoading(false);
        setIsTenantOrgLoading(false);
        return;
      }

      const userId = profilResult.data.user_id as string;
      setSupabaseUserId(userId);

      // 2. Récupérer les adhésions de cet utilisateur
      const { data: rawAdhesions, error: adhesionsError } = await client
        .from("flotte_adhesions")
        .select("id, fleet_id, role, is_active")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (adhesionsError || !rawAdhesions?.length) {
        setMemberships([]);
        setRole(null);
        setActiveFleetIdRaw(null);
        setOrgId(null);
        setTenantOptions([]);
        setIsLoading(false);
        setIsTenantOrgLoading(false);
        return;
      }

      const validAdhesions = rawAdhesions.filter((a) => isValidUuid(a.fleet_id));
      const fleetIds = validAdhesions.map((a) => a.fleet_id);

      // 3. Récupérer les infos des flottes (nom, org_id, clerk_org_id)
      const { data: flottes } = await client
        .from("flottes")
        .select("id, name, org_id, clerk_org_id")
        .in("id", fleetIds);

      const fleetMap = new Map((flottes ?? []).map((f) => [f.id, f]));

      // 4. Construire les memberships applicatifs
      const builtMemberships: FleetMembership[] = validAdhesions.map((a) => ({
        id: a.id,
        fleet_id: a.fleet_id,
        role: a.role as AppRole,
        is_active: true,
      }));
      setMemberships(builtMemberships);

      // 5. Rôle le plus élevé
      const topRole = highestRole(builtMemberships.map((m) => m.role));
      setRole(topRole);

      // 6. Flotte active (mémoire ou première de la liste)
      const stored = localStorage.getItem(ACTIVE_FLEET_KEY);
      const storedValid =
        stored && isValidUuid(stored) && builtMemberships.some((m) => m.fleet_id === stored)
          ? stored
          : null;
      const nextFleet = storedValid ?? builtMemberships[0]?.fleet_id ?? null;
      setActiveFleetIdRaw(nextFleet);
      if (nextFleet) localStorage.setItem(ACTIVE_FLEET_KEY, nextFleet);

      // 7. Tenant options
      const options = builtMemberships
        .map((m) => {
          const flotte = fleetMap.get(m.fleet_id);
          if (!flotte?.org_id) return null;
          return {
            orgId: flotte.org_id as string,
            fleetId: m.fleet_id,
            fleetName: (flotte.name as string) ?? null,
            role: m.role,
          };
        })
        .filter((o): o is NonNullable<typeof o> => o !== null);

      setTenantOptions(options);

      const selectedOption = options.find((o) => o.fleetId === nextFleet);
      setOrgId(selectedOption?.orgId ?? null);
    } catch (err) {
      console.error("[ClerkAuth] Erreur chargement données utilisateur :", err);
    } finally {
      setIsLoading(false);
      setIsTenantOrgLoading(false);
    }
  }, [clerkUser, isSignedIn, getToken]);

  // Déclencher quand l'utilisateur Clerk est prêt
  useEffect(() => {
    if (userLoaded && isSignedIn) {
      void loadUserData();
    }
  }, [userLoaded, isSignedIn, loadUserData]);

  // ── Flotte active ────────────────────────────────────────────────────────
  const setActiveFleetId = useCallback(
    (fleetId: string) => {
      if (!isValidUuid(fleetId)) return;
      if (!memberships.some((m) => m.fleet_id === fleetId)) return;
      setActiveFleetIdRaw(fleetId);
      localStorage.setItem(ACTIVE_FLEET_KEY, fleetId);

      const opt = tenantOptions.find((o) => o.fleetId === fleetId);
      setOrgId(opt?.orgId ?? null);
    },
    [memberships, tenantOptions],
  );

  // ── Flotte effective ─────────────────────────────────────────────────────
  const userFleetId = useMemo(() => {
    if (!memberships.length) return null;
    if (activeFleetId && memberships.some((m) => m.fleet_id === activeFleetId)) {
      return activeFleetId;
    }
    return memberships[0]?.fleet_id ?? null;
  }, [activeFleetId, memberships]);

  // ── Active tenant context ─────────────────────────────────────────────
  const activeTenantContext = useMemo(() => {
    if (!supabaseUserId || !userFleetId || !orgId) return null;
    const membership = memberships.find((m) => m.fleet_id === userFleetId);
    if (!membership) return null;
    return { orgId, fleetId: userFleetId, role: membership.role };
  }, [supabaseUserId, userFleetId, orgId, memberships]);

  // ── AuthUser depuis Clerk ────────────────────────────────────────────────
  const authUser: AuthUser | null = useMemo(() => {
    if (!clerkUser) return null;
    return {
      id: supabaseUserId ?? clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      phone: clerkUser.primaryPhoneNumber?.phoneNumber ?? undefined,
      created_at: clerkUser.createdAt?.toISOString(),
      user_metadata: { full_name: clerkUser.fullName },
      app_metadata: {},
    };
  }, [clerkUser, supabaseUserId]);

  // ── Snapshot local (offline) ──────────────────────────────────────────
  useEffect(() => {
    if (!authUser) {
      clearLocalSessionSnapshot();
      return;
    }
    setLocalSessionSnapshot({
      userId: authUser.id,
      email: authUser.email ?? null,
      activeFleetId: userFleetId,
      role,
      updatedAt: new Date().toISOString(),
    });
  }, [authUser, userFleetId, role]);

  // ── Refresh helpers ──────────────────────────────────────────────────
  const refreshMemberships = useCallback(async (): Promise<FleetMembership[]> => {
    await loadUserData();
    return memberships;
  }, [loadUserData, memberships]);

  const refreshUser = useCallback(async () => {
    await loadUserData();
  }, [loadUserData]);

  // ── Valeur contexte ──────────────────────────────────────────────────
  const value = useMemo(
    (): AuthContextValue => ({
      user: authUser,
      session: null, // Clerk gère les sessions — pas de session Supabase
      role,
      memberships,
      userFleetId,
      orgId,
      activeTenantContext,
      tenantOptions,
      isLoading,
      isTenantOrgLoading,
      // Clerk ne gère pas le flux PASSWORD_RECOVERY de Supabase.
      isPasswordRecovery: false,
      setActiveFleetId,
      refreshMemberships,
      refreshUser,
    }),
    [
      authUser,
      role,
      memberships,
      userFleetId,
      orgId,
      activeTenantContext,
      tenantOptions,
      isLoading,
      isTenantOrgLoading,
      setActiveFleetId,
      refreshMemberships,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
