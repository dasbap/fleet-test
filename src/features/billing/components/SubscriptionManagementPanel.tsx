import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRightLeft, CalendarClock, Car, Eye, Loader2, ShieldOff, XCircle } from "lucide-react";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useFleetSubscriptions,
  useTerminateSubscriptionEarly,
  useTransferVehicleSubscription,
} from "@/hooks/useSubscriptionManagement";
import { cn } from "@/lib/utils";
import type {
  SubscriptionSummary,
  SubscriptionVehicle,
} from "@/services/subscription-management.service";

interface SubscriptionManagementPanelProps {
  fleetId?: string | null;
  canManage: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  trial: "Essai",
  active: "Actif",
  grace_period: "Grâce",
  suspended: "Suspendu",
  expired: "Expiré",
  cancelled: "Terminé",
};

const STATUS_CLASSES: Record<string, string> = {
  trial: "border-blue-200 bg-blue-50 text-blue-700",
  active: "border-green-200 bg-green-50 text-green-700",
  grace_period: "border-amber-200 bg-amber-50 text-amber-700",
  suspended: "border-red-200 bg-red-50 text-red-700",
  expired: "border-zinc-200 bg-zinc-50 text-zinc-700",
  cancelled: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export function SubscriptionManagementPanel({
  fleetId,
  canManage,
}: SubscriptionManagementPanelProps) {
  const { toast } = useToast();
  const subscriptions = useFleetSubscriptions(fleetId ?? undefined);
  const transfer = useTransferVehicleSubscription(fleetId ?? undefined);
  const terminate = useTerminateSubscriptionEarly(fleetId ?? undefined);
  const [selected, setSelected] = useState<SubscriptionSummary | null>(null);
  const [transferDraft, setTransferDraft] = useState<Record<string, string>>({});

  const activeTargets = useMemo(
    () =>
      (subscriptions.data ?? []).filter(
        (subscription) =>
          (subscription.status === "trial" || subscription.status === "active") &&
          (subscription.vehicleCapacity === null || subscription.availableSlots > 0),
      ),
    [subscriptions.data],
  );

  const handleTransfer = async (vehicle: SubscriptionVehicle) => {
    const targetSubscriptionId = transferDraft[vehicle.id];
    if (!targetSubscriptionId) {
      return;
    }

    try {
      await transfer.mutateAsync({
        vehicleId: vehicle.id,
        targetSubscriptionId,
      });
      toast({ title: "Véhicule transféré" });
      setTransferDraft((draft) => ({ ...draft, [vehicle.id]: "" }));
    } catch (error) {
      toast({
        title: "Transfert impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    }
  };

  const handleTerminate = async (subscriptionId: string) => {
    try {
      await terminate.mutateAsync(subscriptionId);
      toast({ title: "Abonnement terminé" });
      setSelected(null);
    } catch (error) {
      toast({
        title: "Action impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    }
  };

  if (!fleetId) {
    return null;
  }

  if (subscriptions.isLoading) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </section>
    );
  }

  if (subscriptions.isError) {
    return (
      <Alert variant="destructive">
        <ShieldOff className="h-4 w-4" />
        <AlertDescription>
          Impossible de charger les abonnements.{" "}
          {subscriptions.error instanceof Error ? subscriptions.error.message : "Erreur PostgREST."}
        </AlertDescription>
      </Alert>
    );
  }

  const rows = subscriptions.data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Abonnements</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} abonnement{rows.length !== 1 ? "s" : ""} lié{rows.length !== 1 ? "s" : ""} à la flotte
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
          <CalendarClock className="mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium">Aucun abonnement enregistré</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Les abonnements apparaîtront ici après activation du plan ou du paiement.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((subscription) => (
            <Card key={subscription.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {subscription.planName ?? subscription.planCode ?? "Plan"}
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          STATUS_CLASSES[subscription.status ?? ""] ?? "border-border",
                        )}
                      >
                        {STATUS_LABELS[subscription.status ?? ""] ?? subscription.status ?? "Statut"}
                      </Badge>
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subscription.fleetName ?? "Flotte"} · début {formatDate(subscription.startsAt)}
                      {subscription.endsAt ? ` · fin ${formatDate(subscription.endsAt)}` : ""}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelected(subscription)}>
                    <Eye className="mr-1.5 h-4 w-4" />
                    Détail
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacité véhicules</span>
                    <span className="font-medium tabular-nums">
                      {subscription.vehicleCount} / {formatCapacity(subscription.vehicleCapacity)}
                    </span>
                  </div>
                  <Progress value={capacityPercent(subscription)} className="h-1.5" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {subscription.vehicles.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Aucun véhicule associé</span>
                  ) : (
                    subscription.vehicles.map((vehicle) => (
                      <Badge key={vehicle.id} variant="secondary" className="gap-1">
                        <Car className="h-3 w-3" />
                        {vehicle.registration ?? vehicle.id.slice(0, 8)}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Abonnement {selected?.planName ?? selected?.planCode}</DialogTitle>
            <DialogDescription>
              {selected?.fleetName ?? "Flotte"} · {selected?.id}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Statut" value={STATUS_LABELS[selected.status ?? ""] ?? selected.status ?? "—"} />
                <Metric label="Début" value={formatDate(selected.startsAt)} />
                <Metric label="Capacité" value={`${selected.vehicleCount} / ${formatCapacity(selected.vehicleCapacity)}`} />
              </div>

              <div className="rounded-lg border">
                <div className="grid grid-cols-[1fr_auto] gap-3 border-b px-4 py-3">
                  <p className="font-medium">Véhicules associés</p>
                  <span className="text-sm text-muted-foreground">{selected.vehicles.length}</span>
                </div>
                <div className="divide-y">
                  {selected.vehicles.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Aucun véhicule actif sur cet abonnement.
                    </div>
                  ) : (
                    selected.vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="min-w-0">
                          <p className="font-medium">{vehicle.registration ?? "Sans plaque"}</p>
                          <p className="text-xs text-muted-foreground">
                            {vehicle.id} · {vehicle.status ?? "statut inconnu"} · {vehicle.fleetName ?? selected.fleetName ?? "flotte"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Association: {formatDate(vehicle.associatedAt)}
                          </p>
                        </div>
                        {canManage && (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Select
                              value={transferDraft[vehicle.id] ?? ""}
                              onValueChange={(value) =>
                                setTransferDraft((draft) => ({ ...draft, [vehicle.id]: value }))
                              }
                            >
                              <SelectTrigger className="w-full sm:w-64" aria-label="Abonnement cible">
                                <SelectValue placeholder="Abonnement cible" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeTargets
                                  .filter((target) => target.id !== selected.id)
                                  .map((target) => (
                                    <SelectItem key={target.id} value={target.id}>
                                      {(target.planName ?? target.planCode ?? "Plan")} · {target.vehicleCount}/{formatCapacity(target.vehicleCapacity)}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!transferDraft[vehicle.id] || transfer.isPending}
                              onClick={() => void handleTransfer(vehicle)}
                            >
                              {transfer.isPending ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                              ) : (
                                <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                              )}
                              Transférer
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {canManage && selected.status !== "cancelled" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Terminer maintenant
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Terminer cet abonnement ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        La date de fin effective sera enregistrée immédiatement. Les véhicules ne seront pas supprimés.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleTerminate(selected.id)}
                        disabled={terminate.isPending}
                      >
                        Confirmer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return format(new Date(value), "d MMM yyyy", { locale: fr });
}

function formatCapacity(value: number | null): string {
  return value === null || value >= 999_999 ? "∞" : String(value);
}

function capacityPercent(subscription: SubscriptionSummary): number {
  if (subscription.vehicleCapacity === null || subscription.vehicleCapacity >= 999_999) {
    return Math.min(100, subscription.vehicleCount);
  }
  return Math.min(100, Math.round((subscription.vehicleCount / Math.max(1, subscription.vehicleCapacity)) * 100));
}
