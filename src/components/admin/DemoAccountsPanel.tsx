/**
 * DemoAccountsPanel — gestion des comptes démo E-Samba.
 *
 * Accessible uniquement aux admins plateforme (admin_profiles).
 * Affiche : liste des comptes démo, statut, expiration, type.
 * Actions : réactiver, désactiver manuellement.
 *
 * Données : demo_profiles via service_role (hook dédié).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { RefreshCw, UserX, UserCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoLegacyProfiles } from "@/hooks/useDemoLegacyProfiles";
import type { DemoProfileAccountType } from "@/repositories/demo-profile.repository";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DemoProfileAccountType, string> = {
  investor: "Investisseur",
  prospect: "Prospect",
  internal: "Interne",
  dev:      "Dev",
};

const TYPE_COLORS: Record<DemoProfileAccountType, string> = {
  investor: "bg-purple-100 text-purple-800",
  prospect: "bg-blue-100 text-blue-800",
  internal: "bg-emerald-100 text-emerald-800",
  dev:      "bg-slate-100 text-slate-700",
};

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "Permanent";
  const d = new Date(expiresAt);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs <= 0) return "Expiré";
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 24) return `${diffH}h restantes`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}j restants`;
}

function expiryBadgeClass(expiresAt: string | null, isActive: boolean): string {
  if (!isActive) return "bg-red-100 text-red-800";
  if (!expiresAt) return "bg-slate-100 text-slate-600";
  const d = new Date(expiresAt);
  const diffH = (d.getTime() - Date.now()) / 3_600_000;
  if (diffH <= 0)  return "bg-red-100 text-red-800";
  if (diffH <= 24) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

// ─── Panel principal ──────────────────────────────────────────────────────────

interface DemoAccountsPanelProps {
  currentAdminId: string;
}

export function DemoAccountsPanel({ currentAdminId }: DemoAccountsPanelProps) {
  const { profiles, isLoading, reload, reactivate, deactivate } = useDemoLegacyProfiles();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  async function handleReactivate(userId: string, extendHours?: number) {
    setActionInProgress(userId);
    await reactivate(userId, currentAdminId, extendHours);
    setActionInProgress(null);
  }

  async function handleDeactivate(userId: string) {
    setActionInProgress(userId);
    await deactivate(userId, currentAdminId);
    setActionInProgress(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Comptes démo</h2>
          <p className="text-sm text-muted-foreground">
            {profiles.length} compte{profiles.length > 1 ? "s" : ""} —{" "}
            {profiles.filter((p) => p.is_active).length} actif{profiles.filter((p) => p.is_active).length > 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void reload()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Rafraîchir
        </Button>
      </div>

      {/* Tableau */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Aucun compte démo
                </TableCell>
              </TableRow>
            )}
            {profiles.map((profile) => (
              <TableRow key={profile.user_id} className={cn(!profile.is_active && "opacity-60")}>
                <TableCell className="font-mono text-sm">{profile.email}</TableCell>

                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    TYPE_COLORS[profile.account_type] ?? TYPE_COLORS.dev,
                  )}>
                    {TYPE_LABELS[profile.account_type] ?? profile.account_type}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge variant={profile.is_active ? "default" : "secondary"}>
                    {profile.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>

                <TableCell>
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    expiryBadgeClass(profile.expires_at, profile.is_active),
                  )}>
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatExpiry(profile.expires_at)}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!profile.is_active ? (
                      /* Réactivation */
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionInProgress === profile.user_id}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Réactiver
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Réactiver ce compte ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Le compte <strong>{profile.email}</strong> sera réactivé.
                              La durée par défaut du type «{TYPE_LABELS[profile.account_type]}» sera appliquée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void handleReactivate(profile.user_id)}>
                              Réactiver
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      /* Désactivation manuelle */
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={actionInProgress === profile.user_id}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Désactiver
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Désactiver ce compte ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Le compte <strong>{profile.email}</strong> sera immédiatement désactivé.
                              Cette action peut être annulée via «Réactiver».
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => void handleDeactivate(profile.user_id)}
                            >
                              Désactiver
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Légende types */}
      <div className="flex flex-wrap gap-2 pt-1">
        {(Object.keys(TYPE_LABELS) as DemoProfileAccountType[]).map((type) => (
          <span key={type} className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            TYPE_COLORS[type],
          )}>
            {TYPE_LABELS[type]} — {
              type === "investor" ? "48h" :
              type === "prospect" ? "7j" :
              "30j"
            }
          </span>
        ))}
      </div>
    </div>
  );
}
