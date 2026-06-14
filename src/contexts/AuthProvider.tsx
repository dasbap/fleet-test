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
import { getE2eMockOrgId, isE2eOnboardingMode } from "@/lib/e2e-onboarding";
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
import {
  devLog,
  devWarn,
  mapSupabaseUserToAuthUser,
  withPromiseTimeout,
} from "@/features/auth/lib/authProviderUtils";
import { AUTH_INIT_TIMEOUT_MS } from "@/lib/auth-flow";

const fleetMemberRepository = new FleetMemberRepository();
const fleetMemberService = new FleetMemberService(fleetMemberRepository);
const fleetRepository = new FleetRepository();
const fleetService = new FleetService(fleetRepository);
const ACTIVE_FLEET_STORAGE_KEY = "esamba.active_fleet_id";

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
  // Vrai si Supabase a émis PASSWORD_RECOVERY (clic lien email reset) — bloque l'aiguillage normal.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

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
        } = await withPromiseTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          "AUTH_GET_SESSION",
        );

        if (cancelled) return;

        if (localSession?.user) {
          const {
            data: { user: serverUser },
            error: userError,
          } = await withPromiseTimeout(
            supabase.auth.getUser(),
            AUTH_INIT_TIMEOUT_MS,
            "AUTH_GET_USER",
          );

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
          await withPromiseTimeout(
            fetchMemberships(serverUser),
            AUTH_INIT_TIMEOUT_MS,
            "AUTH_MEMBERSHIPS",
          );
        } else {
          setSession(localSession);
          setUser(null);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("_TIMEOUT")) {
          devWarn(
            "[Auth] Initialisation session expirée — nettoyage et redirection connexion.",
          );
          await supabase.auth.signOut().catch(() => undefined);
          setSession(null);
          setUser(null);
        } else {
          console.error("Erreur lors de l’initialisation de session :", e);
        }
        setRole(null);
        setMemberships([]);
        setOrgId(null);
        setActiveFleetIdState(null);
        setTenantOptions([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") {
        return;
      }

      // ── Flux reset-password : session temporaire de récupération ──────────────
      // Ne pas charger les memberships ni appliquer l'aiguillage dashboard.
      // Le flag isPasswordRecovery redirige le guard vers /auth/update-password.
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setIsLoading(false);
        return;
      }

      // Après mise à jour du mot de passe, l'event USER_UPDATED signale la fin du flux recovery.
      if (event === "USER_UPDATED") {
        setIsPasswordRecovery(false);
      }

      // Après connexion (SIGNED_IN), éviter un rendu avec user défini mais memberships encore vides :
      // PostLoginGate interpréterait à tort l'absence d'adhésion et redirigerait vers /start.
      if (event === "SIGNED_IN" && nextSession?.user) {
        setIsLoading(true);
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      // Déférer fetchMemberships hors du callback Supabase Auth pour éviter l'AbortError :
      // signInWithPassword avorte les fetch en cours pendant sa propre résolution.
      // setTimeout(0) laisse la transition auth se terminer avant de requêter la DB.
      setTimeout(() => {
        if (nextSession?.user) {
          withPromiseTimeout(
            fetchMemberships(nextSession.user),
            AUTH_INIT_TIMEOUT_MS,
            "AUTH_MEMBERSHIPS",
          )
            .catch((e) =>
              console.error("Erreur memberships (onAuthStateChange):", e),
            )
            .finally(() => setIsLoading(false));
        } else {
          setRole(null);
          setMemberships([]);
          setOrgId(null);
          setActiveFleetIdState(null);
          setTenantOptions([]);
          setIsLoading(false);
        }
      }, 0);
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
      isPasswordRecovery,
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
      isPasswordRecovery,
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
  const mockOrgId = isE2eOnboardingMode() ? getE2eMockOrgId() : "";

  const activeTenantContext = useMemo(
    () =>
      userFleetId
        ? {
            // E2E onboarding : orgId stable pour le wizard ; sinon vide (évite RPC uuid invalides).
            orgId: mockOrgId,
            fleetId: userFleetId,
            role: role ?? "driver",
          }
        : null,
    [mockOrgId, role, userFleetId]
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
      orgId: mockOrgId || (activeTenantContext?.orgId ?? null),
      activeTenantContext,
      tenantOptions: [],
      isLoading: false,
      isTenantOrgLoading: false,
      isPasswordRecovery: false,
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
      mockOrgId,
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
