import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { checkPendingInvitation, acceptInvitation } from './useAcceptInvitation';
import { FleetMemberService } from '@/services/fleet-member.service';
import { FleetMemberRepository } from '@/repositories/fleet-member.repository';

const fleetMemberRepository = new FleetMemberRepository();
const fleetMemberService = new FleetMemberService(fleetMemberRepository);

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
const devLog = (...args: unknown[]) => { if (isDev) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (isDev) console.warn(...args); };

// Définition du type de rôle applicatif
export type AppRole = 'organizer' | 'manager' | 'driver' | 'mechanic';

// Interface pour l'appartenance à une flotte (exportée pour réutilisation dans Profile, etc.)
export interface FleetMembership {
  id: string;
  fleet_id: string;
  role: AppRole;
  is_active: boolean;
}

// Interface du retour du hook useAuth
interface UserWithRole {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  memberships: FleetMembership[];
  userFleetId: string | null;
  isLoading: boolean;
  refreshMemberships: () => Promise<FleetMembership[]>;
  /** Rafraîchit la session et l'utilisateur (métadonnées) sans recharger la page */
  refreshUser: () => Promise<void>;
}

export function useAuth(): UserWithRole {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [memberships, setMemberships] = useState<FleetMembership[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Gère la vérification et acceptation d'une éventuelle invitation automatique
  const processPendingInvitation = async (): Promise<void> => {
    const pendingCode = await checkPendingInvitation();
    if (pendingCode) {
      // Logging pour debug (ok en dev)
      devLog('Traitement de l’invitation en attente :', pendingCode);

      const result = await acceptInvitation(pendingCode);
      if (result.ok) {
        devLog('Invitation acceptée avec succès :', result);
      } else {
        devWarn("Échec de l’acceptation de l’invitation :", result.error);
      }
    }
  };

  // Charge les memberships actifs pour l'utilisateur donné via le service (pas d'appel direct Supabase).
  const fetchMemberships = useCallback(async (userId: string): Promise<FleetMembership[]> => {
    try {
      await processPendingInvitation();

      devLog("🔄 Récupération des memberships pour l'utilisateur:", userId);

      const list = await fleetMemberService.getActiveMembershipsForUser(userId);

      if (list.length > 0) {
        const membershipsList = list as FleetMembership[];
        setMemberships(membershipsList);
        const roleHierarchy: AppRole[] = ['organizer', 'manager', 'mechanic', 'driver'];
        const userRoles = list.map((m) => m.role as AppRole);
        const highestRole = roleHierarchy.find((r) => userRoles.includes(r)) || 'driver';
        setRole(highestRole);
        devLog("✅ Memberships mis à jour:", { count: list.length, role: highestRole, fleetIds: list.map((m) => m.fleet_id) });
        return membershipsList;
      } else {
        devLog("ℹ️ Aucun membership actif trouvé");
        setRole(null);
        setMemberships([]);
        return [];
      }
    } catch (e) {
      console.error("❌ Erreur dans fetchMemberships :", e);
      setRole(null);
      setMemberships([]);
      return [];
    }
  }, []);

  // Initialisation : écoute de l'état d'authentification
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        try {
          if (session?.user) {
            await fetchMemberships(session.user.id);
          } else {
            setRole(null);
            setMemberships([]);
          }
        } catch (e) {
          console.error('Erreur lors du chargement des memberships (onAuthStateChange):', e);
          setRole(null);
          setMemberships([]);
        } finally {
          setIsLoading(false);
        }
      }
    );

    // Vérifie la session existante dès le montage — toujours terminer le chargement (évite blocage "Chargement...")
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        try {
          if (session?.user) {
            await fetchMemberships(session.user.id);
          }
        } catch (e) {
          console.error('Erreur lors du chargement des memberships (getSession):', e);
          setRole(null);
          setMemberships([]);
        } finally {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erreur getSession:', err);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [fetchMemberships]);

  // Premier fleetId actif (priorité à la simplicité pour la V1)
  const userFleetId = memberships.length > 0 ? memberships[0].fleet_id : null;

  // Trace des changements memberships / userFleetId pour diagnostic création de flotte
  useEffect(() => {
    if (memberships.length === 0) {
      devLog("[useAuth] userFleetId dérivé (aucun membership)", { userFleetId: null });
      return;
    }
    const effectiveFleetId = memberships[0].fleet_id;
    devLog("[useAuth] userFleetId dérivé (memberships mis à jour)", {
      userFleetId: effectiveFleetId,
      count: memberships.length,
      fleetIds: memberships.map((m) => m.fleet_id),
    });
  }, [memberships]);

  // Permet de rafraîchir les memberships. Retourne les memberships récupérés pour synchronisation (ex. après création de flotte).
  const refreshMemberships = useCallback(async (): Promise<FleetMembership[]> => {
    devLog("[useAuth] refreshMemberships appelé", { userId: user?.id ?? null });
    if (!user) {
      devWarn("[useAuth] refreshMemberships ignoré (pas d'utilisateur)");
      return [];
    }
    const list = await fetchMemberships(user.id);
    devLog("[useAuth] refreshMemberships terminé", { count: list.length });
    return list;
  }, [user, fetchMemberships]);

  // Rafraîchit la session (et donc user avec les métadonnées à jour) sans recharger la page
  const refreshUser = useCallback(async () => {
    const { data: { session: newSession } } = await supabase.auth.getSession();
    setSession(newSession);
    setUser(newSession?.user ?? null);
  }, []);

  return {
    user,
    session,
    role,
    memberships,
    userFleetId,
    isLoading,
    refreshMemberships,
    refreshUser,
  };
}

// Fonction d'authentification simple
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

// Fonction d’inscription avec gestion de l’invitation
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  invitationFleetId?: string,
  invitationCode?: string
) {
  const redirectUrl = `${window.location.origin}/`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        invitation_fleet_id: invitationFleetId,
        invitation_code: invitationCode,
      },
    },
  });
  return { data, error };
}

// Fonction de déconnexion
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
