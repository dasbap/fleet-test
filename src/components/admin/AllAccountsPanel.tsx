import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AdminAccount {
  user_id: string;
  email: string;
  full_name: string | null;
  account_type: string;
  role: string | null;
  fleet_id: string | null;
  fleet_name: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  expiration_source: "demo" | "subscription" | null;
  must_set_password: boolean;
  is_platform_admin: boolean;
  is_super_admin: boolean;
}

interface RpcError {
  message: string;
}

interface RpcResponse {
  data: unknown;
  error: RpcError | null;
}

interface SupabaseRpcClient {
  rpc: (
    functionName: string,
    parameters?: Record<string, never>,
  ) => Promise<RpcResponse>;
}

interface DeleteUserResponse {
  ok?: boolean;
  error?: string;
  fleet_ids?: string[];
  can_delete_demo_fleets?: boolean;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  investor: "Investisseur",
  internal: "Interne",
  dev: "Développement",
  fleet_member: "Membre flotte",
  admin: "Administration",
  user: "Utilisateur",
  permanent: "Permanent",
};

const ROLE_LABELS: Record<string, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  mechanic: "Mécanicien",
  platform_admin: "Admin plateforme",
  super_admin: "Super admin",
};

function isIntegrationTestAccount(
  account: Pick<AdminAccount, "email" | "full_name">,
): boolean {
  const email = account.email.trim().toLowerCase();
  const fullName = account.full_name?.trim().toLowerCase() ?? "";
  return (
    email === "integration.tests@esamba.test" ||
    /^integration-[a-z0-9-]+@esamba\.test$/.test(email) ||
    fullName === "integration test user"
  );
}

function parseAccounts(data: unknown): AdminAccount[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (value): value is AdminAccount =>
        typeof value === "object" &&
        value !== null &&
        typeof (value as AdminAccount).user_id === "string" &&
        typeof (value as AdminAccount).email === "string",
    )
    .filter((account) => !isIntegrationTestAccount(account));
}

async function getAdminToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session administrateur expirée. Reconnectez-vous.");
  return token;
}

async function forcePasswordChange(account: AdminAccount): Promise<void> {
  const token = await getAdminToken();
  const response = await fetch("/api/admin/user-security", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: account.user_id,
      action: "force_password_change",
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error ?? "force_password_change_failed");
  }
}

async function sendPasswordReset(account: AdminAccount): Promise<void> {
  const token = await getAdminToken();
  const response = await fetch("/api/admin/user-security", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: account.user_id,
      action: "send_password_reset",
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error ?? "password_reset_failed");
  }
}

async function deleteAccountRequest(
  account: AdminAccount,
  deleteOwnedDemoFleets = false,
): Promise<void> {
  const token = await getAdminToken();
  const response = await fetch("/api/admin/delete-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: account.user_id,
      delete_owned_demo_fleets: deleteOwnedDemoFleets,
    }),
  });
  const payload = (await response.json().catch(() => null)) as DeleteUserResponse | null;

  if (response.status === 409 && payload?.error === "last_active_organizer_required") {
    if (payload.can_delete_demo_fleets === true && !deleteOwnedDemoFleets) {
      const fleetCount = payload.fleet_ids?.length ?? 1;
      const confirmed = window.confirm(
        `${account.email} est le dernier organisateur de ${fleetCount} flotte${fleetCount > 1 ? "s" : ""} démo. Supprimer aussi ${fleetCount > 1 ? "ces flottes" : "cette flotte"} et toutes leurs données ?`,
      );
      if (!confirmed) throw new Error("Suppression annulée.");
      await deleteAccountRequest(account, true);
      return;
    }
    throw new Error(
      "Ce compte est le dernier organisateur actif d'une flotte normale. Ajoutez un autre organisateur ou supprimez d'abord la flotte.",
    );
  }

  if (!response.ok || payload?.ok !== true) {
    if (payload?.error === "cannot_delete_current_super_admin") {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte super admin.");
    }
    if (payload?.error === "cannot_delete_super_admin") {
      throw new Error("Un compte super admin ne peut pas être supprimé depuis cette action.");
    }
    throw new Error(payload?.error ?? "delete_user_failed");
  }
}

async function deleteFleetRequest(account: AdminAccount): Promise<void> {
  if (!account.fleet_id) throw new Error("Aucune flotte liée à ce compte.");
  const token = await getAdminToken();
  const response = await fetch("/api/admin/delete-fleet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fleet_id: account.fleet_id }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error ?? "delete_fleet_failed");
  }
}

async function loadAllAccounts(): Promise<AdminAccount[]> {
  const rpcClient = supabase as unknown as SupabaseRpcClient;
  const { data, error } = await rpcClient.rpc("admin_list_all_accounts");
  if (error) throw new Error(error.message);
  return parseAccounts(data);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date invalide";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatExpiration(value: string | null): string {
  if (!value) return "Sans expiration";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date invalide";
  const milliseconds = date.getTime() - Date.now();
  if (milliseconds <= 0) return `Expiré le ${formatDate(value)}`;
  const totalHours = Math.floor(milliseconds / 3_600_000);
  if (totalHours < 24) return `${totalHours}h restantes`;
  return `${Math.floor(totalHours / 24)}j restants`;
}

function expirationClass(expiresAt: string | null): string {
  if (!expiresAt) return "border-muted-foreground/30 text-muted-foreground";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "border-destructive/40 text-destructive";
  const remainingHours = (date.getTime() - Date.now()) / 3_600_000;
  if (remainingHours <= 0) {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  if (remainingHours <= 24) {
    return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function accountTypeLabel(account: AdminAccount): string {
  if (account.is_super_admin) return "Super admin";
  if (account.is_platform_admin) return "Admin plateforme";
  return ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type;
}

function roleLabel(role: string | null): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role;
}

export function AllAccountsPanel() {
  const [search, setSearch] = useState("");
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [forcingUserId, setForcingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingFleetId, setDeletingFleetId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isSuperAdmin } = useRoleAccess();
  const { user } = useAuth();

  const invalidateAdminData = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "all-accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
  };

  const forcePasswordMutation = useMutation({
    mutationFn: forcePasswordChange,
    onMutate: (account) => setForcingUserId(account.user_id),
    onSuccess: (_data, account) => {
      toast({
        title: "Changement imposé",
        description: `${account.email} devra changer son mot de passe à sa prochaine connexion.`,
      });
      invalidateAdminData();
    },
    onError: (error) => {
      toast({
        title: "Action impossible",
        description: error instanceof Error ? error.message : "Impossible d'imposer le changement de mot de passe.",
        variant: "destructive",
      });
    },
    onSettled: () => setForcingUserId(null),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: sendPasswordReset,
    onMutate: (account) => setResettingUserId(account.user_id),
    onSuccess: (_data, account) => {
      toast({
        title: "Email envoyé",
        description: `Un lien de réinitialisation a été envoyé à ${account.email}.`,
      });
      invalidateAdminData();
    },
    onError: (error) => {
      toast({
        title: "Envoi impossible",
        description: error instanceof Error ? error.message : "Impossible d'envoyer l'email de réinitialisation.",
        variant: "destructive",
      });
    },
    onSettled: () => setResettingUserId(null),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteAccountRequest,
    onMutate: (account) => setDeletingUserId(account.user_id),
    onSuccess: (_data, account) => {
      toast({ title: "Compte supprimé", description: `${account.email} a été supprimé définitivement.` });
      invalidateAdminData();
    },
    onError: (error) => {
      toast({
        title: "Suppression impossible",
        description: error instanceof Error ? error.message : "Impossible de supprimer ce compte.",
        variant: "destructive",
      });
    },
    onSettled: () => setDeletingUserId(null),
  });

  const deleteFleetMutation = useMutation({
    mutationFn: deleteFleetRequest,
    onMutate: (account) => setDeletingFleetId(account.fleet_id),
    onSuccess: (_data, account) => {
      toast({
        title: "Flotte supprimée",
        description: `${account.fleet_name ?? account.fleet_id ?? "La flotte"} a été supprimée définitivement.`,
      });
      invalidateAdminData();
    },
    onError: (error) => {
      toast({
        title: "Suppression de flotte impossible",
        description: error instanceof Error ? error.message : "Impossible de supprimer cette flotte.",
        variant: "destructive",
      });
    },
    onSettled: () => setDeletingFleetId(null),
  });

  const accountsQuery = useQuery({
    queryKey: ["admin", "all-accounts"],
    queryFn: loadAllAccounts,
    staleTime: 30_000,
  });

  const filteredAccounts = useMemo(() => {
    const accounts = accountsQuery.data ?? [];
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return accounts;
    return accounts.filter((account) =>
      [
        account.email,
        account.full_name,
        account.account_type,
        account.role,
        account.fleet_name,
        account.fleet_id,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch)),
    );
  }, [accountsQuery.data, search]);

  const activeCount = filteredAccounts.filter((account) => account.is_active).length;
  const expiredCount = filteredAccounts.filter(
    (account) => account.expires_at !== null && new Date(account.expires_at).getTime() <= Date.now(),
  ).length;
  const destructiveBusy = deleteUserMutation.isPending || deleteFleetMutation.isPending;

  if (accountsQuery.isLoading) {
    return (
      <div className="flex min-h-52 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (accountsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-3">
            <div>
              <p className="font-medium text-destructive">Impossible de charger les comptes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {accountsQuery.error instanceof Error ? accountsQuery.error.message : "Une erreur inconnue est survenue."}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void accountsQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Tous les comptes</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredAccounts.length} compte{filteredAccounts.length > 1 ? "s" : ""} — {activeCount} actif{activeCount > 1 ? "s" : ""} — {expiredCount} expiré{expiredCount > 1 ? "s" : ""}
          </p>
          {isSuperAdmin ? (
            <p className="mt-1 text-xs font-medium text-destructive">
              Mode super admin : suppression définitive des comptes et flottes disponible.
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={accountsQuery.isFetching}
          onClick={() => void accountsQuery.refetch()}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", accountsQuery.isFetching && "animate-spin")} />
          Rafraîchir
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
          placeholder="Rechercher par email, nom, rôle ou flotte..."
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compte</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Flotte</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>État</TableHead>
              <TableHead className="min-w-[460px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  Aucun compte trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => {
                const cannotDeleteUser =
                  account.is_super_admin || account.user_id === user?.id || destructiveBusy;
                return (
                  <TableRow key={account.user_id} className={cn(!account.is_active && "opacity-60")}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">{account.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.full_name ?? `Créé le ${formatDate(account.created_at)}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.is_platform_admin ? "default" : "outline"}>
                        {account.is_platform_admin ? <ShieldCheck className="mr-1 h-3 w-3" /> : null}
                        {accountTypeLabel(account)}
                      </Badge>
                    </TableCell>
                    <TableCell>{roleLabel(account.role)}</TableCell>
                    <TableCell>
                      <div className="max-w-52">
                        <p className="truncate">{account.fleet_name ?? "—"}</p>
                        {account.fleet_id ? (
                          <p className="truncate font-mono text-xs text-muted-foreground">{account.fleet_id}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={expirationClass(account.expires_at)}>
                        <Clock className="mr-1 h-3 w-3" />
                        {formatExpiration(account.expires_at)}
                      </Badge>
                      {account.expiration_source ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {account.expiration_source === "demo" ? "Accès temporaire" : "Abonnement flotte"}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={account.is_active ? "secondary" : "destructive"}>
                          {account.is_active ? "Actif" : "Inactif"}
                        </Badge>
                        {account.must_set_password ? (
                          <Badge variant="outline">
                            <KeyRound className="mr-1 h-3 w-3" />
                            MDP requis
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!account.is_active || forcePasswordMutation.isPending || resetPasswordMutation.isPending || account.must_set_password}
                          onClick={() => forcePasswordMutation.mutate(account)}
                        >
                          {forcingUserId === account.user_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                          Changer au login
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!account.is_active || resetPasswordMutation.isPending || forcePasswordMutation.isPending}
                          onClick={() => resetPasswordMutation.mutate(account)}
                        >
                          {resettingUserId === account.user_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Réinitialiser MDP
                        </Button>
                        {isSuperAdmin && account.fleet_id ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={destructiveBusy}
                            onClick={() => {
                              const label = account.fleet_name ?? account.fleet_id;
                              if (!window.confirm(`Supprimer définitivement la flotte ${label} et toutes ses données liées ?`)) return;
                              deleteFleetMutation.mutate(account);
                            }}
                          >
                            {deletingFleetId === account.fleet_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Supprimer flotte
                          </Button>
                        ) : null}
                        {isSuperAdmin ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={cannotDeleteUser}
                            title={account.is_super_admin ? "Un compte super admin ne peut pas être supprimé ici" : account.user_id === user?.id ? "Vous ne pouvez pas supprimer votre propre compte" : undefined}
                            onClick={() => {
                              if (!window.confirm(`Supprimer définitivement le compte ${account.email} ? Cette action est irréversible.`)) return;
                              deleteUserMutation.mutate(account);
                            }}
                          >
                            {deletingUserId === account.user_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Supprimer compte
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Les admins plateforme voient uniquement les comptes associés à une date d’expiration. Les super admins voient également les comptes sans expiration et disposent des actions de suppression définitive.
      </p>
    </section>
  );
}
