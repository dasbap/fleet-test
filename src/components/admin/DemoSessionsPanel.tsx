import { useState } from "react";
import { Link } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  CalendarClock,
  Clock,
  Copy,
  CreditCard,
  Filter,
  Link2,
  MoreVertical,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import type { DemoSession } from "@/hooks/useAdminDemoAccounts";
import { ROUTE_PATHS } from "@/navigation/routePaths";

interface DemoSessionsPanelProps {
  sessions: DemoSession[];
  isLoading: boolean;
  onReload: () => Promise<void>;
  onSuspend: (userId: string) => Promise<boolean>;
  onReactivate: (userId: string) => Promise<boolean>;
  onUpdateExpiration: (
    userId: string,
    expiresAt: string | null
  ) => Promise<boolean>;
  onDelete: (userId: string) => Promise<boolean>;
  onResetFleet: (fleetId: string) => Promise<boolean>;
  onGenerateMagicLink: (
    userId: string,
    email: string,
    fleetId?: string | null
  ) => Promise<string | null>;
}

const TYPE_COLORS: Record<string, string> = {
  investor: "bg-purple-100 text-purple-800",
  prospect: "bg-blue-100 text-blue-800",
  internal: "bg-emerald-100 text-emerald-800",
  dev: "bg-slate-100 text-slate-700",
};

const TYPE_LABELS: Record<string, string> = {
  investor: "Investisseur",
  prospect: "Prospect",
  internal: "Interne",
  dev: "Dev",
};

const ROLE_LABELS: Record<string, string> = {
  driver: "Conducteur",
  manager: "Manager",
  mechanic: "Mecanicien",
  organizer: "Organisateur",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return "< 1h";
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}j`;
}

function formatExpiry(
  expiresAt: string | null,
  isActive: boolean
): { label: string; cls: string } {
  if (!isActive) return { label: "Suspendu", cls: "bg-red-100 text-red-800" };
  if (!expiresAt)
    return { label: "Permanent", cls: "bg-slate-100 text-slate-600" };

  const diffH = (new Date(expiresAt).getTime() - Date.now()) / 3_600_000;
  if (diffH <= 0) return { label: "Expire", cls: "bg-red-100 text-red-800" };
  if (diffH <= 24)
    return {
      label: `${Math.ceil(diffH)}h`,
      cls: "bg-amber-100 text-amber-800",
    };
  return {
    label: `${Math.floor(diffH / 24)}j`,
    cls: "bg-emerald-100 text-emerald-800",
  };
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function maxExpirationLocalValue(createdAt: string): string {
  const date = new Date(createdAt);
  date.setMonth(date.getMonth() + 1);
  return toDatetimeLocalValue(date.toISOString());
}

export function DemoSessionsPanel({
  sessions,
  isLoading,
  onReload,
  onSuspend,
  onReactivate,
  onUpdateExpiration,
  onDelete,
  onResetFleet: _onResetFleet,
  onGenerateMagicLink,
}: DemoSessionsPanelProps) {
  const { toast } = useToast();
  const { isSuperAdmin, isLoading: isRoleLoading } = useRoleAccess();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [expirationDraft, setExpirationDraft] = useState("");

  const filtered = sessions.filter((s) => {
    const effectivelyActive =
      s.is_active &&
      (!s.expires_at || new Date(s.expires_at).getTime() > Date.now());
    if (filter === "active" && !effectivelyActive) return false;
    if (filter === "inactive" && effectivelyActive) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.email.toLowerCase().includes(q) ||
      (s.fleet_name ?? "").toLowerCase().includes(q) ||
      (s.magic_link_label ?? "").toLowerCase().includes(q)
    );
  });

  async function withBusy(userId: string, action: () => Promise<unknown>) {
    setActionInProgress(userId);
    try {
      await action();
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleGenerateLink(session: DemoSession) {
    await withBusy(session.user_id, async () => {
      const url = await onGenerateMagicLink(
        session.user_id,
        session.email,
        session.fleet_id
      );
      if (url) {
        void navigator.clipboard.writeText(url);
        toast({
          title: "Lien genere et copie",
          description: `${url.slice(0, 60)}...`,
        });
      } else {
        toast({
          title: "Lien non genere",
          description: "Le compte doit etre actif et non expire.",
          variant: "destructive",
        });
      }
    });
  }

  async function handleUpdateExpiration(userId: string) {
    const expiresAt = fromDatetimeLocalValue(expirationDraft);
    if (!expiresAt) {
      toast({ title: "Date invalide", variant: "destructive" });
      return;
    }
    await withBusy(userId, () => onUpdateExpiration(userId, expiresAt));
  }

  function copyExistingLink(session: DemoSession) {
    if (!session.magic_link_token) return;
    const url = `${window.location.origin}/demo/access?token=${session.magic_link_token}`;
    void navigator.clipboard.writeText(url);
    toast({ title: "Lien copie" });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 w-full animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    );
  }

  const activeCount = sessions.filter(
    (s) =>
      s.is_active &&
      (!s.expires_at || new Date(s.expires_at).getTime() > Date.now()),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sessions demo</h2>
          <p className="text-sm text-muted-foreground">
            {sessions.length} compte{sessions.length > 1 ? "s" : ""} -{" "}
            {activeCount} actif{activeCount > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1.5" />
                {filter === "all"
                  ? "Tous"
                  : filter === "active"
                  ? "Actifs"
                  : "Inactifs"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>
                Tous
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("active")}>
                Actifs seulement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("inactive")}>
                Inactifs seulement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => void onReload()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Rafraichir
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email, flotte, label..."
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Abonnement</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Expiration
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  Activite
                </span>
              </TableHead>
              <TableHead>Liens utilises</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-10"
                >
                  {search ? "Aucun resultat" : "Aucune session demo"}
                </TableCell>
              </TableRow>
            )}

            {filtered.map((session) => {
              const effectivelyActive =
                session.is_active &&
                (!session.expires_at ||
                  new Date(session.expires_at).getTime() > Date.now());
              const expiry = formatExpiry(
                session.expires_at,
                effectivelyActive
              );
              const maxReactivateAt = new Date(session.created_at);
              maxReactivateAt.setMonth(maxReactivateAt.getMonth() + 1);
              const canReactivate = maxReactivateAt.getTime() > Date.now();
              const busy = actionInProgress === session.user_id;

              return (
                <TableRow
                  key={session.user_id}
                  className={cn(!effectivelyActive && "opacity-60")}
                >
                  <TableCell className="font-mono text-xs max-w-[160px] truncate">
                    {session.email}
                    {session.magic_link_label && (
                      <span className="block text-muted-foreground text-[10px] truncate">
                        {session.magic_link_label}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        TYPE_COLORS[session.account_type] ?? TYPE_COLORS.dev
                      )}
                    >
                      {TYPE_LABELS[session.account_type] ??
                        session.account_type}
                    </span>
                  </TableCell>

                  <TableCell className="text-sm">
                    {session.demo_role
                      ? ROLE_LABELS[session.demo_role] ?? session.demo_role
                      : "-"}
                  </TableCell>

                  <TableCell className="text-sm">
                    {session.fleet_name ?? (
                      <span className="text-muted-foreground">
                        Aucune flotte creee
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {session.fleet_id ? (
                      isRoleLoading ? (
                        <Button variant="outline" size="sm" disabled>
                          Chargement...
                        </Button>
                      ) : isSuperAdmin ? (
                        <Button asChild variant="outline" size="sm" className="gap-2">
                          <Link
                            to={`${ROUTE_PATHS.dashboardAdminSubscriptions}?fleet=${encodeURIComponent(session.fleet_id)}`}
                          >
                            <CreditCard className="h-4 w-4" aria-hidden />
                            Gérer
                          </Link>
                        </Button>
                      ) : (
                        <span
                          className="text-xs text-muted-foreground"
                          title="Seul le super administrateur peut attribuer un abonnement."
                        >
                          Super admin requis
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">
                        Après création flotte
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        expiry.cls
                      )}
                    >
                      {expiry.label}
                    </span>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {session.last_activity_at
                      ? `il y a ${formatRelative(session.last_activity_at)}`
                      : session.last_login
                      ? `conn. il y a ${formatRelative(session.last_login)}`
                      : "Jamais connecte"}
                  </TableCell>

                  <TableCell className="text-sm text-center">
                    {session.magic_link_token ? (
                      <span
                        title={`Derniere utilisation: ${
                          session.last_used_at ?? "jamais"
                        }`}
                      >
                        {session.used_count}x
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        {session.magic_link_token && (
                          <DropdownMenuItem
                            onClick={() => copyExistingLink(session)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copier le lien actuel
                          </DropdownMenuItem>
                        )}

                        {effectivelyActive && (
                          <DropdownMenuItem
                            onClick={() => void handleGenerateLink(session)}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Nouveau magic link
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setExpirationDraft(
                                  toDatetimeLocalValue(session.expires_at)
                                );
                              }}
                            >
                              <CalendarClock className="h-4 w-4 mr-2" />
                              Modifier expiration
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Modifier la date de fin
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                La demo ne peut pas depasser un mois depuis sa
                                creation. Tu peux aussi choisir une date plus
                                proche pour reduire l'acces.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                              <Input
                                type="datetime-local"
                                value={expirationDraft}
                                max={maxExpirationLocalValue(
                                  session.created_at
                                )}
                                onChange={(e) =>
                                  setExpirationDraft(e.target.value)
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Maximum:{" "}
                                {new Date(
                                  session.created_at
                                ).toLocaleDateString("fr-FR")}{" "}
                                + 1 mois
                              </p>
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  void handleUpdateExpiration(session.user_id)
                                }
                              >
                                Enregistrer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {effectivelyActive ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Suspendre
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Suspendre ce compte ?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>{session.email}</strong> sera
                                  immediatement desactive.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() =>
                                    void withBusy(session.user_id, () =>
                                      onSuspend(session.user_id)
                                    )
                                  }
                                >
                                  Suspendre
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : canReactivate ? (
                          <DropdownMenuItem
                            onClick={() =>
                              void withBusy(session.user_id, () =>
                                onReactivate(session.user_id)
                              )
                            }
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Reactiver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled>
                            <UserX className="h-4 w-4 mr-2" />
                            Periode maximale atteinte
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Supprimer ce compte demo ?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                <strong>{session.email}</strong> sera supprime
                                avec ses liens demo et ses rattachements. Cette
                                action est definitive.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() =>
                                  void withBusy(session.user_id, () =>
                                    onDelete(session.user_id)
                                  )
                                }
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
