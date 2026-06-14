import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DemoProfileRepository } from "@/repositories/demo-profile.repository";
import type { DemoProfileRow } from "@/repositories/demo-profile.repository";

const demoProfileRepository = new DemoProfileRepository();

/** Liste et actions sur les profils démo (RPC list_demo_profiles). */
export function useDemoLegacyProfiles() {
  const [profiles, setProfiles] = useState<DemoProfileRow[]>([]);
  const [isLoading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await demoProfileRepository.listProfiles();
      setProfiles(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur chargement", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const reactivate = useCallback(
    async (userId: string, adminId: string, extendHours?: number) => {
      try {
        const result = await demoProfileRepository.reactivateAccount(userId, adminId, extendHours);
        if (!result.ok) {
          toast({ title: "Réactivation impossible", variant: "destructive" });
          return false;
        }
        toast({
          title: "Compte réactivé",
          description: result.expires_at
            ? `Expire le ${new Date(result.expires_at).toLocaleString("fr-FR")}`
            : "Accès permanent rétabli",
        });
        await load();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        toast({ title: "Erreur réactivation", description: message, variant: "destructive" });
        return false;
      }
    },
    [load, toast],
  );

  const deactivate = useCallback(
    async (userId: string, adminId: string) => {
      try {
        const result = await demoProfileRepository.deactivateAccount(
          userId,
          adminId,
          "désactivation manuelle depuis DemoAccountsPanel",
        );
        if (!result.ok) {
          toast({ title: "Erreur désactivation", variant: "destructive" });
          return false;
        }
        toast({ title: "Compte désactivé" });
        await load();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        toast({ title: "Erreur désactivation", description: message, variant: "destructive" });
        return false;
      }
    },
    [load, toast],
  );

  return { profiles, isLoading, reload: load, reactivate, deactivate };
}
