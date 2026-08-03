/**
 * useAdminDemoAccounts — hook admin pour gérer les comptes démo E-Samba.
 *
 * Expose :
 *   - sessions      : liste complète enrichie (email, rôle, flotte, expiration, activité)
 *   - isLoading
 *   - reload()
 *   - createAccess(payload)      → crée prospect + magic link (via BFF)
 *   - suspendAccount(userId)     → désactive le compte
 *   - reactivateAccount(userId)  → réactive le compte
 *   - resetFleet(fleetId)        → remet à zéro la flotte démo
 *   - generateMagicLink(userId)  → génère un nouveau lien d'accès (via BFF)
 *   - demoFleets                 → flottes is_demo disponibles
 *
 * Sécurité : ADMIN_SECRET n'est JAMAIS exposé côté client.
 * Les appels sensibles passent par les routes BFF Vercel (/api/admin/*)
 * qui portent le secret côté serveur et vérifient le JWT admin.
 */

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AdminDemoRepository } from "@/repositories/admin-demo.repository";
import { AdminDemoBffRepository } from "@/repositories/admin-demo-bff.repository";
import { AdminDemoService } from "@/services/admin-demo.service";
import type {
  CreateDemoPayload,
  DemoAccountType,
  DemoRole,
  DemoSession,
} from "@/services/admin-demo.service";

export type { DemoAccountType, DemoRole, DemoSession, CreateDemoPayload };

export interface UseAdminDemoAccountsReturn {
  sessions: DemoSession[];
  isLoading: boolean;
  reload: () => Promise<void>;
  createAccess: (
    payload: CreateDemoPayload,
  ) => Promise<{ ok: boolean; magic_url?: string; error?: string }>;
  suspendAccount: (userId: string) => Promise<boolean>;
  reactivateAccount: (userId: string, extendHours?: number) => Promise<boolean>;
  updateAccountExpiration: (userId: string, expiresAt: string | null) => Promise<boolean>;
  deleteAccount: (userId: string) => Promise<boolean>;
  resetFleet: (fleetId: string) => Promise<boolean>;
  generateMagicLink: (
    userId: string,
    email: string,
    fleetId?: string | null,
    label?: string,
  ) => Promise<string | null>;
}

const adminDemoRepository = new AdminDemoRepository();
const adminDemoBffRepository = new AdminDemoBffRepository();
const adminDemoService = new AdminDemoService(adminDemoRepository, adminDemoBffRepository);

export function useAdminDemoAccounts(): UseAdminDemoAccountsReturn {
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [isLoading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, session } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminDemoService.loadDashboardData();
      setSessions(data.sessions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur chargement sessions", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const createAccess = useCallback(
    async (payload: CreateDemoPayload) => {
      const result = await adminDemoService.createAccess(session?.access_token, payload);
      if (result.ok) {
        await load();
      }
      return result;
    },
    [load, session?.access_token],
  );

  const suspendAccount = useCallback(
    async (userId: string): Promise<boolean> => {
      const adminId = user?.id ?? "";
      if (!adminId) {
        toast({ title: "Session expirée", variant: "destructive" });
        return false;
      }

      try {
        const ok = await adminDemoService.suspendAccount(userId, adminId);
        if (!ok) {
          toast({ title: "Erreur suspension", variant: "destructive" });
          return false;
        }
        toast({ title: "Compte suspendu" });
        await load();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        toast({ title: "Erreur suspension", description: message, variant: "destructive" });
        return false;
      }
    },
    [load, toast, user?.id],
  );

  const reactivateAccount = useCallback(
    async (userId: string, extendHours?: number): Promise<boolean> => {
      const adminId = user?.id ?? "";
      if (!adminId) {
        toast({ title: "Session expirée", variant: "destructive" });
        return false;
      }

      try {
        const ok = await adminDemoService.reactivateAccount(userId, adminId, extendHours);
        if (!ok) {
          toast({ title: "Erreur réactivation", variant: "destructive" });
          return false;
        }
        toast({ title: "Compte réactivé" });
        await load();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        toast({ title: "Erreur réactivation", description: message, variant: "destructive" });
        return false;
      }
    },
    [load, toast, user?.id],
  );

  const updateAccountExpiration = useCallback(
    async (userId: string, expiresAt: string | null): Promise<boolean> => {
      const adminId = user?.id ?? "";
      if (!adminId) {
        toast({ title: "Session expirÃ©e", variant: "destructive" });
        return false;
      }

      try {
        const result = await adminDemoService.updateAccountExpiration(userId, adminId, expiresAt);
        if (!result.ok) {
          toast({ title: "Erreur modification expiration", variant: "destructive" });
          return false;
        }
        toast({ title: "Expiration mise a jour" });
        await load();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        toast({ title: "Erreur modification expiration", description: message, variant: "destructive" });
        return false;
      }
    },
    [load, toast, user?.id],
  );

  const deleteAccount = useCallback(
    async (userId: string): Promise<boolean> => {
      const adminId = user?.id ?? "";
      if (!adminId) {
        toast({ title: "Session expirÃ©e", variant: "destructive" });
        return false;
      }

      try {
        const result = await adminDemoService.deleteAccount(userId, adminId);
        if (!result.ok) {
          toast({ title: "Erreur suppression demo", variant: "destructive" });
          return false;
        }
        toast({ title: "Compte demo supprime" });
        await load();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        toast({ title: "Erreur suppression demo", description: message, variant: "destructive" });
        return false;
      }
    },
    [load, toast, user?.id],
  );

  const resetFleet = useCallback(
    async (fleetId: string): Promise<boolean> => {
      try {
        const result = await adminDemoService.resetFleet(fleetId);
        if (!result.ok) {
          toast({ title: "Erreur reset flotte", variant: "destructive" });
          return false;
        }
        toast({
          title: "Flotte réinitialisée",
          description: `${result.vehiclesDeleted} véhicules supprimés`,
        });
        await load();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        toast({ title: "Erreur reset flotte", description: message, variant: "destructive" });
        return false;
      }
    },
    [load, toast],
  );

  const generateMagicLink = useCallback(
    async (
      userId: string,
      email: string,
      fleetId?: string | null,
      label?: string,
    ): Promise<string | null> => {
      const magicUrl = await adminDemoService.generateMagicLink(
        session?.access_token,
        userId,
        email,
        fleetId,
        label,
      );
      if (magicUrl) {
        await load();
      }
      return magicUrl;
    },
    [load, session?.access_token],
  );

  return {
    sessions,
    isLoading,
    reload: load,
    createAccess,
    suspendAccount,
    reactivateAccount,
    updateAccountExpiration,
    deleteAccount,
    resetFleet,
    generateMagicLink,
  };
}
