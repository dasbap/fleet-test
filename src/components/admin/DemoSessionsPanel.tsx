/**
 * DemoSessionsPanel — tableau complet des sessions démo actives + historique.
 *
 * Colonnes : email, rôle, type, organisation (fleet_name), expiration,
 *            dernière activité, magic link, actions.
 * Actions : générer un nouveau magic link, suspendre, réactiver, reset flotte.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  RefreshCw,
  Copy,
  Link2,
  UserX,
  UserCheck,
  RotateCcw,
  MoreVertical,
  Clock,
  Activity,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { DemoSession } from "@/hooks/useAdminDemoAccounts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DemoSessionsPanelProps {
  sessions:            DemoSession[];
  isLoading:           boolean;
  onReload:            () => Promise<void>;
  onSuspend:           (userId: string) => Promise<boolean>;
  onReactivate:        (userId: string) => Promise<boolean>;
  onResetFleet:        (fleetId: string) => Promise<boolean>;
  onGenerateMagicLink: (userId: string, email: string, fleetId: string) => Promise<string | null>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  investor: "bg-purple-100 text-purple-800",
  prospect: "bg-blue-100 text-blue-800",
  internal: "bg-emerald-100 text-emerald-800",
  dev:      "bg-slate-100 text-slate-700",
};

const TYPE_LABELS: Record<string, string> = {
  investor: "Investisseur",
  prospect: "Prospect",
  internal: "Interne",
  dev:      "Dev",
};

const ROLE_LABELS: Record<string, string> = {
  driver:    "Conducteur",
  manager:   "Manager",
  mechanic:  "Mécanicien",
  organizer: "Organisateur",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1)  return "< 1h";
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}j`;
}

function formatExpiry(expiresAt: string | null, isActive: boolean): { label: string; cls: string } {
  if (!isActive) return { label: "Suspendu", cls: "bg-red-100 text-red-800" };
  if (!expiresAt) return { label: "Permanent", cls: "bg-slate-100 text-slate-600" };

  const diffH = (new Date(expiresAt).getTime() - Date.now()) / 3_600_000;
  if (diffH <= 0)  return { label: "Expiré",         cls: "bg-red-100 text-red-800" };
  if (diffH <= 24) return { label: `${Math.ceil(diffH)}h`,  cls: "bg-amber-100 text-amber-800" };
  const diffD = Math.floor(diffH / 24);
  return { label: `${diffD}j`, cls: "bg-emerald-100 text-emerald-800" };
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function DemoSessionsPanel({
  sessions,
  isLoading,
  onReload,
  onSuspend,
  onReactivate,
  onResetFleet,
  onGenerateMagicLink,
}: DemoSessionsPanelProps) {
  const { toast } = useToast();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "active" | "inactive">("all");

  // ── Filtrage ───────────────────────────────────────────────────────────────

  const filtered = sessions.filter((s) => {
    if (filter === "active"   && !s.is_active) return false;
    if (filter === "inactive" &&  s.is_active) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.email.toLowerCase().includes(q) ||
      (s.fleet_name ?? "").toLowerCase().includes(q) ||
      (s.magic_link_label ?? "").toLowerCase().includes(q)
    );
  });

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleSuspend(userId: string) {
    setActionInProgress(userId);
    await onSuspend(userId);
    setActionInProgress(null);
  }

  async function handleReactivate(userId: string) {
    setActionInProgress(userId);
    await onReactivate(userId);
    setActionInProgress(null);
  }

  async function handleResetFleet(userId: string, fleetId: string) {
    setActionInProgress(userId);
    await onResetFleet(fleetId);
    setActionInProgress(null);
  }

  async function handleGenerateLink(session: DemoSession) {
    if (!session.fleet_id) {
      toast({ title: "Aucune flotte assignée", variant: "destructive" });
      return;
    }
    setActionInProgress(session.user_id);
    const url = await onGenerateMagicLink(session.user_id, session.email, session.fleet_id);
    setActionInProgress(null);

    if (url) {
      void navigator.clipboard.writeText(url);
      toast({ title: "Lien généré et copié", description: url.slice(0, 60) + "…" });
    }
  }

  function copyExistingLink(session: DemoSession) {
    if (!session.magic_link_token) return;
    const url = `${window.location.origin}/demo/access?token=${session.magic_link_token}`;
    void navigator.clipboard.writeText(url);
    toast({ title: "Lien copié" });
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeCount = sessions.filter((s) => s.is_active).length;

  return (
    <div className="space-y-4">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sessions démo</h2>
          <p className="text-sm text-muted-foreground">
            {sessions.length} compte{sessions.length > 1 ? "s" : ""} —{" "}
            {activeCount} actif{activeCount > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtre rapide */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1.5" />
                {filter === "all" ? "Tous" : filter === "active" ? "Actifs" : "Inactifs"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>Tous</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("active")}>Actifs seulement</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("inactive")}>Inactifs seulement</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => void onReload()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email, flotte, label…"
          className="pl-9"
        />
      </div>

      {/* Tableau */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />Expiration
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" />Activité
                </span>
              </TableHead>
              <TableHead>Liens utilisés</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  {search ? "Aucun résultat" : "Aucune session démo"}
                </TableCell>
              </TableRow>
            )}

            {filtered.map((session) => {
              const expiry = formatExpiry(session.expires_at, session.is_active);
              const busy   = actionInProgress === session.user_id;

              return (
                <TableRow
                  key={session.user_id}
                  className={cn(!session.is_active && "opacity-60")}
                >
                  {/* Email */}
                  <TableCell className="font-mono text-xs max-w-[160px] truncate">
                    {session.email}
                    {session.magic_link_label && (
                      <span className="block text-muted-foreground text-[10px] truncate">
                        {session.magic_link_label}
                      </span>
                    )}
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      TYPE_COLORS[session.account_type] ?? TYPE_COLORS.dev,
                    )}>
                      {TYPE_LABELS[session.account_type] ?? session.account_type}
                    </span>
                  </TableCell>

                  {/* Rôle démo */}
                  <TableCell className="text-sm">
                    {session.demo_role ? (ROLE_LABELS[session.demo_role] ?? session.demo_role) : "—"}
                  </TableCell>

                  {/* Organisation */}
                  <TableCell className="text-sm">
                    {session.fleet_name ?? <span className="text-muted-foreground">Aucune flotte</span>}
                  </TableCell>

                  {/* Expiration */}
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      expiry.cls,
                    )}>
                      {expiry.label}
                    </span>
                  </TableCell>

                  {/* Dernière activité */}
                  <TableCell className="text-sm text-muted-foreground">
                    {session.last_activity_at
                      ? `il y a ${formatRelative(session.last_activity_at)}`
                      : session.last_login
                        ? `connx. il y a ${formatRelative(session.last_login)}`
                        : "Jamais connecté"}
                  </TableCell>

                  {/* Utilisation magic link */}
                  <TableCell className="text-sm text-center">
                    {session.magic_link_token ? (
                      <span title={`Dernière utilisation: ${session.last_used_at ?? "jamais"}`}>
                        {session.used_count}×
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Actions */}
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
                        {/* Copier lien existant */}
                        {session.magic_link_token && (
                          <DropdownMenuItem onClick={() => copyExistingLink(session)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copier le lien actuel
                          </DropdownMenuItem>
                        )}

                        {/* Générer nouveau lien */}
                        <DropdownMenuItem onClick={() => void handleGenerateLink(session)}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Nouveau magic link
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Suspendre / Réactiver */}
                        {session.is_active ? (
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
                                <AlertDialogTitle>Suspendre ce compte ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>{session.email}</strong> sera immédiatement désactivé.
                                  Réversible via «Réactiver».
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => void handleSuspend(session.user_id)}
                                >
                                  Suspendre
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <DropdownMenuItem onClick={() => void handleReactivate(session.user_id)}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Réactiver
                          </DropdownMenuItem>
                        )}

                        {/* Reset flotte */}
                        {session.fleet_id && (
                          <>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-amber-600 focus:text-amber-600"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Réinitialiser la flotte
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Réinitialiser la flotte démo ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tous les véhicules et données de la flotte{" "}
                                    <strong>{session.fleet_name}</strong> seront supprimés.
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-amber-600 hover:bg-amber-700"
                                    onClick={() => void handleResetFleet(session.user_id, session.fleet_id!)}
                                  >
                                    Réinitialiser
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
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
