import { useMemo, useState } from "react";
import { LockKeyhole, Search, UnlockKeyhole } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RegistrationLock {
  normalized_registration: string;
  fleet_id: string;
  fleet_name: string | null;
  locked: boolean;
  first_used_at: string;
  released_at: string | null;
  active_vehicle_id: string | null;
  active_registration: string | null;
}

interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface RpcClient {
  rpc<T = unknown>(fn: string, params?: Record<string, unknown>): Promise<RpcResult<T>>;
}

const rpcClient = supabase as unknown as RpcClient;

async function loadAllLocks(): Promise<RegistrationLock[]> {
  const { data, error } = await rpcClient.rpc<unknown>("admin_list_registration_locks", {
    p_fleet_id: null,
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data as RegistrationLock[]) : [];
}

export function AdminRegistrationLocksPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [unlockTarget, setUnlockTarget] = useState<RegistrationLock | null>(null);

  const locksQuery = useQuery({
    queryKey: ["admin", "registration-locks", "all"],
    queryFn: loadAllLocks,
    staleTime: 30_000,
  });

  const locks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = locksQuery.data ?? [];
    if (!query) return rows;
    return rows.filter((lock) =>
      [lock.normalized_registration, lock.active_registration ?? "", lock.fleet_name ?? "", lock.fleet_id]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [locksQuery.data, search]);

  const unlockMutation = useMutation({
    mutationFn: async (lock: RegistrationLock) => {
      const { data, error } = await rpcClient.rpc("admin_release_vehicle_registration", {
        p_registration: lock.normalized_registration,
      });
      if (error) throw new Error(error.message);
      const result = data as { ok?: boolean; error?: string } | null;
      if (result?.ok !== true) throw new Error(result?.error ?? "unlock_failed");
      return lock;
    },
    onSuccess: (lock) => {
      setUnlockTarget(null);
      toast({
        title: "Immatriculation libérée",
        description: `${lock.normalized_registration} n'est plus réservée à son ancienne flotte.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "registration-locks"] });
    },
    onError: (error) => {
      toast({
        title: "Libération impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <section className="rounded-xl border bg-card">
        <div className="space-y-3 border-b p-5">
          <div>
            <h3 className="font-semibold">Verrous d'immatriculation de la plateforme</h3>
            <p className="text-sm text-muted-foreground">
              Les verrous restent visibles même après la suppression de leur flotte. Seul un administrateur peut les libérer.
            </p>
          </div>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une plaque ou une flotte"
              className="pl-9"
              aria-label="Rechercher un verrou d'immatriculation"
            />
          </div>
        </div>

        <div className="divide-y">
          {locks.map((lock) => (
            <div
              key={lock.normalized_registration}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">
                    {lock.active_registration || lock.normalized_registration}
                  </span>
                  {lock.locked ? (
                    <Badge variant="outline" className="gap-1">
                      <LockKeyhole className="h-3 w-3" />
                      Réservée
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <UnlockKeyhole className="h-3 w-3" />
                      Libérée
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lock.fleet_name || "Flotte supprimée"}
                </p>
                <p className="text-xs text-muted-foreground">ID flotte historique : {lock.fleet_id}</p>
              </div>

              {lock.locked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={unlockMutation.isPending}
                  onClick={() => setUnlockTarget(lock)}
                >
                  <UnlockKeyhole className="mr-2 h-4 w-4" />
                  Enlever le verrou
                </Button>
              ) : null}
            </div>
          ))}

          {!locksQuery.isLoading && locks.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              {search.trim() ? "Aucun verrou ne correspond à cette recherche." : "Aucun verrou d'immatriculation."}
            </p>
          ) : null}
        </div>
      </section>

      <AlertDialog
        open={Boolean(unlockTarget)}
        onOpenChange={(open) => {
          if (!open && !unlockMutation.isPending) setUnlockTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Libérer cette immatriculation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {unlockTarget
                ? `${unlockTarget.normalized_registration} pourra être attribuée à une autre flotte dès qu'aucun véhicule actif ne l'utilise.`
                : "Cette réservation sera libérée."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlockMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={unlockMutation.isPending || !unlockTarget}
              onClick={(event) => {
                event.preventDefault();
                if (unlockTarget) unlockMutation.mutate(unlockTarget);
              }}
            >
              {unlockMutation.isPending ? "Libération..." : "Libérer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
