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
import {
  checkPendingInvitation,
  acceptInvitation,
} from "@/hooks/useAcceptInvitation";
import { FleetMemberService } from "@/services/fleet-member.service";
import { FleetService } from "@/services/fleet.service";
import { FleetMemberRepository } from "@/repositories/fleet-member.repository";
import { FleetRepository } from "@/repositories/fleet.repository";
import {
  clearLocalSessionSnapshot,
  setLocalSessionSnapshot,
} from "@/lib/storage/flotteEsambaLocalCache";
import type { AppRole, AuthUser, FleetMembership } from "@/types/auth";
import { AuthContext, type AuthContextValue } from "@/contexts/auth-context";
import { isValidUuid } from "@/lib/isUuid";

const fleetMemberRepository = new FleetMemberRepository();
const fleetMemberService = new FleetMemberService(fleetMemberRepository);
const fleetRepository = new FleetRepository();
const fleetService = new FleetService(fleetRepository);
const ACTIVE_FLEET_STORAGE_KEY = "esamba.active_fleet_id";

const isDev =
  typeof import.meta !== "undefined" && import.meta.env?.DEV === true;
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
  const [orgId, setOrgId] = useState<string | null>(null);
  const [activeFleetId, setActiveFleetIdState] = useState<string | null>(null);
  const [tenantOptions, setTenantOptions] = useState<
    { orgId: string; fleetId: string; fleetName: string | null; role: AppRole }[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTenantOrgLoading, setIsTenantOrgLoading] = useState<boolean>(false);

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
        devLog(
          "🔄 Récupération des memberships pour l'utilisateur:",
          sessionUser.id
        );
        const list = await fleetMemberService.getActiveMembershipsForUser(
          sessionUser.id
        );

        if (list.length > 0) {
          const membershipsList = (list as FleetMembership[]).filter((m) =>
            isValidUuid(m.fleet_id),
          );
          if (membershipsList.length === 0) {
            devWarn(
              "[Auth] Adhésions ignorées : fleet_id non UUID (session ou données incohérentes).",
            );
            setRole(null);
            setMemberships([]);
            setActiveFleetIdState(null);
            setOrgId(null);
            setTenantOptions([]);
            localStorage.removeItem(ACTIVE_FLEET_STORAGE_KEY);
            return [];
          }
          setMemberships(membershipsList);
          const roleHierarchy: AppRole[] = [
            "organizer",
            "manager",
            "mechanic",
            "driver",
          ];
          const userRoles = list.map((m) => m.role as AppRole);
          const highestRole =
            roleHierarchy.find((r) => userRoles.includes(r)) || "driver";
          setRole(highestRole);

          const rawStored = localStorage.getItem(ACTIVE_FLEET_STORAGE_KEY);
          if (rawStored && !isValidUuid(rawStored)) {
            localStorage.removeItem(ACTIVE_FLEET_STORAGE_KEY);
          }
          const storedFleetId =
            rawStored && isValidUuid(rawStored) ? rawStored : null;
          const defaultFleetId = membershipsList[0].fleet_id;
          const nextFleetId = storedFleetId &&
            membershipsList.some((m) => m.fleet_id === storedFleetId)
            ? storedFleetId
            : defaultFleetId;
          setActiveFleetIdState(nextFleetId);
          localStorage.setItem(ACTIVE_FLEET_STORAGE_KEY, nextFleetId);

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
        setActiveFleetIdState(null);
        setOrgId(null);
        setTenantOptions([]);
        localStorage.removeItem(ACTIVE_FLEET_STORAGE_KEY);
        return [];
      } catch (e) {
        console.error("❌ Erreur dans fetchMemberships :", e);
        setRole(null);
        setMemberships([]);
        setActiveFleetIdState(null);
        setOrgId(null);
        setTenantOptions([]);
        localStorage.removeItem(ACTIVE_FLEET_STORAGE_KEY);
        return [];
      }
    },
    []
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
            setOrgId(null);
            setActiveFleetIdState(null);
            setTenantOptions([]);
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
        setOrgId(null);
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
      // Après connexion (SIGNED_IN), éviter un rendu avec user défini mais memberships encore vides :
      // PostLoginGate interpréterait à tort l'absence d'adhésion et redirigerait vers /start.
      if (event === "SIGNED_IN" && nextSession?.user) {
        setIsLoading(true);
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      try {
        if (nextSession?.user) {
          await fetchMemberships(nextSession.user);
        } else {
          setRole(null);
          setMemberships([]);
          setOrgId(null);
          setActiveFleetIdState(null);
          setTenantOptions([]);
        }
      } catch (e) {
        console.error(
          "Erreur lors du chargement des memberships (onAuthStateChange):",
          e
        );
        setRole(null);
        setMemberships([]);
        setActiveFleetIdState(null);
        setTenantOptions([]);
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

  const userFleetId = useMemo(() => {
    if (memberships.length === 0) {
      return null;
    }
    if (
      activeFleetId &&
      memberships.some((membership) => membership.fleet_id === activeFleetId)
    ) {
      return activeFleetId;
    }
    return memberships[0].fleet_id;
  }, [activeFleetId, memberships]);

  useEffect(() => {
    if (!userFleetId) {
      devLog("[Auth] userFleetId dérivé (aucun membership)", {
        userFleetId: null,
      });
      setOrgId(null);
      setTenantOptions([]);
      setIsTenantOrgLoading(false);
      return;
    }
    const effectiveFleetId = userFleetId;
    devLog("[Auth] userFleetId dérivé (memberships mis à jour)", {
      userFleetId: effectiveFleetId,
      count: memberships.length,
      fleetIds: memberships.map((m) => m.fleet_id),
    });
    const fleetIds = memberships.map((membership) => membership.fleet_id);
    setIsTenantOrgLoading(true);
    void fleetService
      .getFleetsByIds(fleetIds)
      .then((fleets) => {
        const fleetById = new Map(fleets.map((fleet) => [fleet.id, fleet]));
        const nextTenantOptions = memberships
          .map((membership) => {
            const fleet = fleetById.get(membership.fleet_id);
            if (!fleet?.orgId) {
              return null;
            }
            return {
              orgId: fleet.orgId,
              fleetId: membership.fleet_id,
              fleetName: fleet.name ?? null,
              role: membership.role,
            };
          })
          .filter((value): value is NonNullable<typeof value> => value !== null);
        setTenantOptions(nextTenantOptions);
        const selectedTenant = nextTenantOptions.find(
          (tenant) => tenant.fleetId === effectiveFleetId
        );
        setOrgId(selectedTenant?.orgId ?? null);
      })
      .catch((error) => {
        console.error(
          "Erreur lors de la récupération de l'orgId de la flotte:",
          error
        );
        setOrgId(null);
        setTenantOptions([]);
      })
      .finally(() => {
        setIsTenantOrgLoading(false);
      });
  }, [memberships, userFleetId]);

  const setActiveFleetId = useCallback(
    (fleetId: string) => {
      if (!isValidUuid(fleetId)) {
        devWarn("[Auth] Identifiant de flotte invalide (UUID attendu)", {
          fleetId,
        });
        return;
      }
      const hasMembership = memberships.some(
        (membership) => membership.fleet_id === fleetId
      );
      if (!hasMembership) {
        devWarn("[Auth] Tentative de changement vers une flotte non autorisée", {
          fleetId,
        });
        return;
      }
      setActiveFleetIdState(fleetId);
      localStorage.setItem(ACTIVE_FLEET_STORAGE_KEY, fleetId);
    },
    [memberships]
  );

  const activeTenantContext = useMemo(() => {
    if (!user?.id || !userFleetId) {
      return null;
    }
    const currentMembership = memberships.find(
      (membership) => membership.fleet_id === userFleetId
    );
    if (!currentMembership) {
      return null;
    }
    if (!orgId) {
      return null;
    }
    return {
      orgId,
      fleetId: userFleetId,
      role: currentMembership.role,
    };
  }, [memberships, orgId, user?.id, userFleetId]);

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

  const refreshMemberships = useCallback(async (): Promise<
    FleetMembership[]
  > => {
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
      setActiveFleetIdState(null);
      setTenantOptions([]);
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
      orgId,
      tenantOptions,
      isLoading,
      isTenantOrgLoading,
      refreshMemberships,
      refreshUser,
      setActiveFleetId,
      activeTenantContext,
    }),
    [
      user,
      session,
      role,
      memberships,
      userFleetId,
      orgId,
      tenantOptions,
      isLoading,
      isTenantOrgLoading,
      refreshMemberships,
      refreshUser,
      setActiveFleetId,
      activeTenantContext,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const EMPTY_MEMBERSHIPS: FleetMembership[] = [];

function MockAuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(() =>
    mockAuthService.loadPersisted()
  );

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
    [snapshot?.memberships]
  );

  const refreshMemberships = useCallback(
    async () => memberships,
    [memberships]
  );

  const refreshUser = useCallback(async () => {
    setSnapshot(mockAuthService.loadPersisted());
  }, []);

  const userFleetId = memberships.length > 0 ? memberships[0].fleet_id : null;
  const activeTenantContext = useMemo(
    () =>
      userFleetId
        ? {
            orgId: "mock-org",
            fleetId: userFleetId,
            role: role ?? "driver",
          }
        : null,
    [role, userFleetId]
  );

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
      orgId: activeTenantContext?.orgId ?? null,
      activeTenantContext,
      tenantOptions: [],
      isLoading: false,
      isTenantOrgLoading: false,
      setActiveFleetId: () => {
        // En mode mock, le changement de flotte est géré par la configuration mock.
      },
      refreshMemberships,
      refreshUser,
    }),
    [
      user,
      role,
      memberships,
      userFleetId,
      activeTenantContext,
      refreshMemberships,
      refreshUser,
    ]
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
