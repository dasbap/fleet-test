import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
    parameters?: Record<string, never>
  ) => Promise<RpcResponse>;
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

function parseAccounts(data: unknown): AdminAccount[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(
    (value): value is AdminAccount =>
      typeof value === "object" &&
      value !== null &&
      typeof (value as AdminAccount).user_id === "string" &&
      typeof (value as AdminAccount).email === "string"
  ).filter((account) => !isIntegrationTestAccount(account));
}

function isIntegrationTestAccount(account: Pick<AdminAccount, "email" | "full_name">): boolean {
  const email = account.email.trim().toLowerCase();
  const fullName = account.full_name?.trim().toLowerCase() ?? "";

  return (
    email === "integration.tests@esamba.test" ||
    /^integration-[a-z0-9-]+@esamba\.test$/.test(email) ||
    fullName === "integration test user"
  );
}

async function forcePasswordChange(account: AdminAccount): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error("Session administrateur expirée. Reconnectez-vous.");
  }

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
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error("Session administrateur expirée. Reconnectez-vous.");
  }

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

async function loadAllAccounts(): Promise<AdminAccount[]> {
  const rpcClient = supabase as unknown as SupabaseRpcClient;

  const { data, error } = await rpcClient.rpc("admin_list_all_accounts");

  if (error) {
    throw new Error(error.message);
  }

  return parseAccounts(data);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatExpiration(value: string | null): string {
  if (!value) {
    return "Sans expiration";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  const milliseconds = date.getTime() - Date.now();

  if (milliseconds <= 0) {
    return `Expiré le ${formatDate(value)}`;
  }

  const totalHours = Math.floor(milliseconds / 3_600_000);

  if (totalHours < 24) {
    return `${totalHours}h restantes`;
  }

  const totalDays = Math.floor(totalHours / 24);

  return `${totalDays}j restants`;
}

function expirationClass(expiresAt: string | null): string {
  if (!expiresAt) {
    return "border-muted-foreground/30 text-muted-foreground";
  }

  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    return "border-destructive/40 text-destructive";
  }

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
  if (account.is_super_admin) {
    return "Super admin";
  }

  if (account.is_platform_admin) {
    return "Admin plateforme";
  }

  return ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type;
}

function roleLabel(role: string | null): string {
  if (!role) {
    return "—";
  }

  return ROLE_LABELS[role] ?? role;
}

export function AllAccountsPanel() {
  const [search, setSearch] = useState("");
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [forcingUserId, setForcingUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const forcePasswordMutation = useMutation({
    mutationFn: forcePasswordChange,
    onMutate: (account) => setForcingUserId(account.user_id),
    onSuccess: (_data, account) => {
      toast({
        title: "Changement imposé",
        description: `${account.email} devra changer son mot de passe à sa prochaine connexion.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "all-accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Action impossible",
        description:
          error instanceof Error
            ? error.message
            : "Impossible d'imposer le changement de mot de passe.",
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
      void queryClient.invalidateQueries({ queryKey: ["admin", "all-accounts"] });
    },
    onError: (error) => {
      toast({
        title: "Envoi impossible",
        description:
          error instanceof Error
            ? error.message
            : "Impossible d'envoyer l'email de réinitialisation.",
        variant: "destructive",
      });
    },
    onSettled: () => setResettingUserId(null),
  });

  const accountsQuery = useQuery({
    queryKey: ["admin", "all-accounts"],
    queryFn: loadAllAccounts,
    staleTime: 30_000,
  });

  const filteredAccounts = useMemo(() => {
    const accounts = accountsQuery.data ?? [];
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return accounts;
    }

    return accounts.filter((account) => {
      const searchableValues = [
        account.email,
        account.full_name,
        account.account_type,
        account.role,
        account.fleet_name,
        account.fleet_id,
      ];

      return searchableValues.some((value) =>
        value?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [accountsQuery.data, search]);

  const activeCount = filteredAccounts.filter(
    (account) => account.is_active
  ).length;

  const expiredCount = filteredAccounts.filter(
    (account) =>
      account.expires_at !== null &&
      new Date(account.expires_at).getTime() <= Date.now()
  ).length;

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
              <p className="font-medium text-destructive">
                Impossible de charger les comptes
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {accountsQuery.error instanceof Error
                  ? accountsQuery.error.message
                  : "Une erreur inconnue est survenue."}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void accountsQuery.refetch()}
            >
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
            {filteredAccounts.length} compte
            {filteredAccounts.length > 1 ? "s" : ""}
            {" — "}
            {activeCount} actif
            {activeCount > 1 ? "s" : ""}
            {" — "}
            {expiredCount} expiré
            {expiredCount > 1 ? "s" : ""}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={accountsQuery.isFetching}
          onClick={() => void accountsQuery.refetch()}
        >
          <RefreshCw
            className={cn(
              "mr-2 h-4 w-4",
              accountsQuery.isFetching && "animate-spin"
            )}
          />
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

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compte</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Flotte</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>État</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 text-center text-muted-foreground"
                >
                  Aucun compte trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => (
                <TableRow
                  key={account.user_id}
                  className={cn(!account.is_active && "opacity-60")}
                >
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium">{account.email}</p>

                      <p className="text-xs text-muted-foreground">
                        {account.full_name ??
                          `Créé le ${formatDate(account.created_at)}`}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        account.is_platform_admin ? "default" : "outline"
                      }
                    >
                      {account.is_platform_admin ? (
                        <ShieldCheck className="mr-1 h-3 w-3" />
                      ) : null}

                      {accountTypeLabel(account)}
                    </Badge>
                  </TableCell>

                  <TableCell>{roleLabel(account.role)}</TableCell>

                  <TableCell>
                    <div className="max-w-52">
                      <p className="truncate">{account.fleet_name ?? "—"}</p>

                      {account.fleet_id ? (
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {account.fleet_id}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={expirationClass(account.expires_at)}
                    >
                      <Clock className="mr-1 h-3 w-3" />

                      {formatExpiration(account.expires_at)}
                    </Badge>

                    {account.expiration_source ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {account.expiration_source === "demo"
                          ? "Accès temporaire"
                          : "Abonnement flotte"}
                      </p>
                    ) : null}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant={
                          account.is_active ? "secondary" : "destructive"
                        }
                      >
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
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          !account.is_active ||
                          forcePasswordMutation.isPending ||
                          resetPasswordMutation.isPending ||
                          account.must_set_password
                        }
                        onClick={() => forcePasswordMutation.mutate(account)}
                      >
                        {forcingUserId === account.user_id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="mr-2 h-4 w-4" />
                        )}
                        À changer au prochain login
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          !account.is_active ||
                          resetPasswordMutation.isPending ||
                          forcePasswordMutation.isPending
                        }
                        onClick={() => resetPasswordMutation.mutate(account)}
                      >
                        {resettingUserId === account.user_id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Réinitialiser le MDP
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Les admins plateforme voient uniquement les comptes associés à une date
        d’expiration. Les super admins voient également les comptes sans
        expiration.
      </p>
    </section>
  );
}
