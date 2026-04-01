import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_MODE_CHANGED_EVENT, isMockAuthEnabled } from "@/lib/authMode";
import { MOCK_AUTH_CHANGED_EVENT } from "@/lib/auth-actions";
import { mockAuthService } from "@/services/mock-auth.service";
import { checkPendingInvitation, acceptInvitation } from "@/hooks/useAcceptInvitation";
import { FleetMemberService } from "@/services/fleet-member.service";
import { FleetMemberRepository } from "@/repositories/fleet-member.repository";
import {
  clearLocalSessionSnapshot,
  setLocalSessionSnapshot,
} from "@/lib/storage/flotteEsambaLocalCache";
import type { AppRole, AuthUser, FleetMembership } from "@/types/auth";
import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";

const fleetMemberRepository = new FleetMemberRepository();
const fleetMemberService = new FleetMemberService(fleetMemberRepository);

const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV === true;
const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};
const devWarn = (...args: unknown[]) => {
  if (isDev) console.warn(...args);
};

function mapSupabaseUserToAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    created_at: user.created_at,
    user_metadata: user.user_metadata as Record<string, unknown>,
    app_metadata: user.app_metadata as Record<string, unknown>,
  };
}

function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [memberships, setMemberships] = useState<FleetMembership[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const processPendingInvitation = async (sessionUser: User): Promise<void> => {
    const pendingCode = await checkPendingInvitation(sessionUser);
    if (pendingCode) {
      devLog("Traitement de l’invitation en attente :", pendingCode);
      const result = await acceptInvitation(pendingCode);
      if (result.ok) {
        devLog("Invitation acceptée avec succès :", result);
      } else {
        devWarn("Échec de l’acceptation de l’invitation :", result.error);
      }
    }
  };

  const fetchMemberships = useCallback(
    async (sessionUser: User): Promise<FleetMembership[]> => {
      try {
        await processPendingInvitation(sessionUser);
        devLog("🔄 Récupération des memberships pour l'utilisateur:", sessionUser.id);
        const list = await fleetMemberService.getActiveMembershipsForUser(sessionUser.id);

        if (list.length > 0) {
          const membershipsList = list as FleetMembership[];
          setMemberships(membershipsList);
          const roleHierarchy: AppRole[] = ["organizer", "manager", "mechanic", "driver"];
          const userRoles = list.map((m) => m.role as AppRole);
          const highestRole =
            roleHierarchy.find((r) => userRoles.includes(r)) || "driver";
          setRole(highestRole);
          devLog("✅ Memberships mis à jour:", {
            count: list.length,
            role: highestRole,
            fleetIds: list.map((m) => m.fleet_id),
          });
          return membershipsList;
        }
        devLog("ℹ️ Aucun membership actif trouvé");
        setRole(null);
        setMemberships([]);
        return [];
      } catch (e) {
        console.error("❌ Erreur dans fetchMemberships :", e);
        setRole(null);
        setMemberships([]);
        return [];
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const initSession = async (): Promise<void> => {
      try {
        const {
          data: { session: localSession },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (localSession?.user) {
          const {
            data: { user: serverUser },
            error: userError,
          } = await supabase.auth.getUser();

          if (cancelled) return;

          if (userError || !serverUser) {
            await supabase.auth.signOut();
            if (cancelled) return;
            setSession(null);
            setUser(null);
            setRole(null);
            setMemberships([]);
            return;
          }

          setSession(localSession);
          setUser(serverUser);
          await fetchMemberships(serverUser);
        } else {
          setSession(localSession);
          setUser(null);
        }
      } catch (e) {
        console.error("Erreur lors de l’initialisation de session :", e);
        setRole(null);
        setMemberships([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === "INITIAL_SESSION") {
        return;
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      try {
        if (nextSession?.user) {
          await fetchMemberships(nextSession.user);
        } else {
          setRole(null);
          setMemberships([]);
        }
      } catch (e) {
        console.error("Erreur lors du chargement des memberships (onAuthStateChange):", e);
        setRole(null);
        setMemberships([]);
      } finally {
        setIsLoading(false);
      }
    });

    void initSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchMemberships]);

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState !== "visible") return;
      void supabase.auth.refreshSession().catch(() => {
        /* hors ligne ou session non renouvelable */
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (memberships.length === 0) {
      devLog("[Auth] userFleetId dérivé (aucun membership)", { userFleetId: null });
      return;
    }
    const effectiveFleetId = memberships[0].fleet_id;
    devLog("[Auth] userFleetId dérivé (memberships mis à jour)", {
      userFleetId: effectiveFleetId,
      count: memberships.length,
      fleetIds: memberships.map((m) => m.fleet_id),
    });
  }, [memberships]);

  const userFleetId = memberships.length > 0 ? memberships[0].fleet_id : null;

  useEffect(() => {
    if (!user) {
      clearLocalSessionSnapshot();
      return;
    }
    setLocalSessionSnapshot({
      userId: user.id,
      email: user.email ?? null,
      activeFleetId: userFleetId,
      role,
      updatedAt: new Date().toISOString(),
    });
  }, [user, userFleetId, role]);

  const refreshMemberships = useCallback(async (): Promise<FleetMembership[]> => {
    devLog("[Auth] refreshMemberships appelé", { userId: user?.id ?? null });
    if (!user) {
      devWarn("[Auth] refreshMemberships ignoré (pas d'utilisateur)");
      return [];
    }
    const list = await fetchMemberships(user);
    devLog("[Auth] refreshMemberships terminé", { count: list.length });
    return list;
  }, [user, fetchMemberships]);

  const refreshUser = useCallback(async () => {
    const {
      data: { user: nextUser },
      error,
    } = await supabase.auth.getUser();
    if (error || !nextUser) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setRole(null);
      setMemberships([]);
      return;
    }
    const {
      data: { session: newSession },
    } = await supabase.auth.getSession();
    setSession(newSession);
    setUser(nextUser);
  }, []);

  const value = useMemo(
    (): AuthContextValue => ({
      user: mapSupabaseUserToAuthUser(user),
      session,
      role,
      memberships,
      userFleetId,
      isLoading,
      refreshMemberships,
      refreshUser,
    }),
    [
      user,
      session,
      role,
      memberships,
      userFleetId,
      isLoading,
      refreshMemberships,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const EMPTY_MEMBERSHIPS: FleetMembership[] = [];

function MockAuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(() => mockAuthService.loadPersisted());

  useEffect(() => {
    const sync = () => setSnapshot(mockAuthService.loadPersisted());
    sync();
    window.addEventListener(MOCK_AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(MOCK_AUTH_CHANGED_EVENT, sync);
  }, []);

  const user = snapshot?.user ?? null;
  const role = snapshot?.role ?? null;
  const memberships = useMemo(
    () => snapshot?.memberships ?? EMPTY_MEMBERSHIPS,
    [snapshot?.memberships],
  );

  const refreshMemberships = useCallback(async () => memberships, [memberships]);

  const refreshUser = useCallback(async () => {
    setSnapshot(mockAuthService.loadPersisted());
  }, []);

  const userFleetId = memberships.length > 0 ? memberships[0].fleet_id : null;

  useEffect(() => {
    if (!user) {
      clearLocalSessionSnapshot();
      return;
    }
    setLocalSessionSnapshot({
      userId: user.id,
      email: user.email ?? null,
      activeFleetId: userFleetId,
      role,
      updatedAt: new Date().toISOString(),
    });
  }, [user, userFleetId, role]);

  const value = useMemo(
    (): AuthContextValue => ({
      user,
      session: null,
      role,
      memberships,
      userFleetId,
      isLoading: false,
      refreshMemberships,
      refreshUser,
    }),
    [user, role, memberships, userFleetId, refreshMemberships, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mockEnabled, setMockEnabled] = useState(() => isMockAuthEnabled());

  useEffect(() => {
    const syncMode = () => setMockEnabled(isMockAuthEnabled());
    window.addEventListener(AUTH_MODE_CHANGED_EVENT, syncMode);
    return () => window.removeEventListener(AUTH_MODE_CHANGED_EVENT, syncMode);
  }, []);

  if (mockEnabled) {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
}
