import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRightLeft, CalendarClock, Car, CheckCircle2, Eye, Loader2, ShieldOff, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useFleetSubscriptions,
  useTerminateSubscriptionEarly,
  useTransferVehicleSubscription,
} from "@/hooks/useSubscriptionManagement";
import { cn } from "@/lib/utils";
import { ROUTE_PATHS } from "@/navigation/routePaths";
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

const ENDED_STATUSES = new Set(["cancelled", "expired"]);

export function SubscriptionManagementPanel({
  fleetId,
  canManage,
}: SubscriptionManagementPanelProps) {
  const { toast } = useToast();
  const subscriptions = useFleetSubscriptions(fleetId ?? undefined);
  const transfer = useTransferVehicleSubscription(fleetId ?? undefined);
  const terminate = useTerminateSubscriptionEarly(fleetId ?? undefined);
  const [selected, setSelected] = useState<SubscriptionSummary | null>(null);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [confirmTerminateId, setConfirmTerminateId] = useState<string | null>(null);
  const [transferDraft, setTransferDraft] = useState<Record<string, string>>({});
  const [showEndedSubscriptions, setShowEndedSubscriptions] = useState(false);

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
    if (terminatingId) {
      return;
    }

    setTerminatingId(subscriptionId);
    try {
      await terminate.mutateAsync(subscriptionId);
      toast({ title: "Abonnement terminé" });
      setConfirmTerminateId(null);
      setSelected(null);
    } catch (error) {
      toast({
        title: "Action impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue.",
        variant: "destructive",
      });
    } finally {
      setTerminatingId(null);
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
  const visibleRows = showEndedSubscriptions
    ? rows
    : rows.filter((subscription) => !isEndedSubscription(subscription));
  const endedCount = rows.filter(isEndedSubscription).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Abonnements</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} abonnement{rows.length !== 1 ? "s" : ""} lié{rows.length !== 1 ? "s" : ""} à la flotte
          </p>
        </div>
        {endedCount > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={showEndedSubscriptions}
              onCheckedChange={setShowEndedSubscriptions}
              aria-label="Afficher les abonnements termines"
            />
            <span>Afficher les abonnements termines</span>
          </label>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
          <CalendarClock className="mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium">Aucun abonnement enregistré</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Les abonnements apparaîtront ici après activation du plan ou du paiement.
          </p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
          <CalendarClock className="mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="font-medium">Aucun abonnement actif visible</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Activez l'affichage des abonnements termines pour consulter l'historique.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleRows.map((subscription) => (
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
                  <div className="flex flex-wrap gap-2">
                    {canManage && isEndedSubscription(subscription) ? (
                      <Button asChild size="sm">
                        <Link to={buildRenewalPricingHref(subscription)}>
                          Renouveler {subscription.planName ?? subscription.planCode ?? "abonnement"}
                        </Link>
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => setSelected(subscription)}>
                    <Eye className="mr-1.5 h-4 w-4" />
                    Détail
                    </Button>
                  </div>
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
                <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Utilises</p>
                    <p className="font-medium tabular-nums">{subscription.vehicleCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Emplacements disponibles</p>
                    <p className="font-medium tabular-nums">
                      {formatAvailableSlots(subscription)} / {formatCapacity(subscription.vehicleCapacity)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total abonnement</p>
                    <p className="font-medium tabular-nums">{formatCapacity(subscription.vehicleCapacity)}</p>
                  </div>
                </div>
                <SubscriptionModuleBadges subscription={subscription} />
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

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTerminateId(null);
            setSelected(null);
          }
        }}
      >
        <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Abonnement {selected?.planName ?? selected?.planCode}</DialogTitle>
            <DialogDescription>
              {selected?.fleetName ?? "Flotte"} · {selected?.id}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label="Statut" value={STATUS_LABELS[selected.status ?? ""] ?? selected.status ?? "—"} />
                <Metric label="Début" value={formatDate(selected.startsAt)} />
                <Metric label="Capacité" value={`${selected.vehicleCount} / ${formatCapacity(selected.vehicleCapacity)}`} />
                <Metric label="Emplacements libres" value={`${formatAvailableSlots(selected)} / ${formatCapacity(selected.vehicleCapacity)}`} />
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-3 font-medium">Modules actifs sur cet abonnement</p>
                <SubscriptionModuleBadges subscription={selected} />
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
                                  .filter(
                                    (target) =>
                                      target.id !== selected.id &&
                                      isSameSubscriptionPlanType(selected, target),
                                  )
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
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  {confirmTerminateId !== selected.id ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmTerminateId(selected.id)}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Terminer maintenant
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-destructive">Terminer cet abonnement ?</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          La date de fin effective sera enregistrée immédiatement. Les véhicules ne seront pas supprimés.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={terminatingId === selected.id || terminate.isPending}
                          onClick={() => setConfirmTerminateId(null)}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleTerminate(selected.id)}
                          disabled={terminatingId === selected.id || terminate.isPending}
                        >
                          {terminatingId === selected.id || terminate.isPending ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : null}
                          Confirmer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SubscriptionModuleBadges({ subscription }: { subscription: SubscriptionSummary }) {
  const modules = getEnabledSubscriptionModules(subscription);

  if (modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun module payant actif sur cet abonnement.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {modules.map((module) => (
        <Badge key={module} variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          {module}
        </Badge>
      ))}
    </div>
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

function formatAvailableSlots(subscription: SubscriptionSummary): string {
  return subscription.vehicleCapacity === null || subscription.vehicleCapacity >= 999_999
    ? "illimite"
    : String(Math.max(0, subscription.availableSlots));
}

function isSameSubscriptionPlanType(source: SubscriptionSummary, target: SubscriptionSummary): boolean {
  return (source.planCode ?? source.planName ?? "") === (target.planCode ?? target.planName ?? "");
}

function isEndedSubscription(subscription: SubscriptionSummary): boolean {
  return ENDED_STATUSES.has(subscription.status ?? "");
}

function getEnabledSubscriptionModules(subscription: SubscriptionSummary): string[] {
  return [
    subscription.financeEnabled ? "Finances & collectes" : null,
    subscription.reportsEnabled ? "Rapports d'activité" : null,
    subscription.driverScoringEnabled ? "Scoring conducteur" : null,
    subscription.anomalyInsightsEnabled ? "IA Pulse+ (anomalies)" : null,
    subscription.geofencingEnabled ? "Géofencing" : null,
    subscription.scheduledReportsEnabled ? "Rapports auto PDF" : null,
    subscription.offlineDriverEnabled ? "Offline conducteur" : null,
    subscription.aiEnabled ? "IA avancée (Pulse+)" : null,
  ].filter((module): module is string => Boolean(module));
}

function buildRenewalPricingHref(subscription: SubscriptionSummary): string {
  const planCode = encodeURIComponent(subscription.planCode ?? "starter");
  const vehicleCount = Math.max(
    1,
    subscription.vehicleSlots ?? subscription.vehicleCapacity ?? subscription.vehicleCount,
  );
  const renewId = encodeURIComponent(subscription.id);

  return `${ROUTE_PATHS.pricing}?plan=${planCode}&vehicles=${vehicleCount}&renew=${renewId}`;
}

function capacityPercent(subscription: SubscriptionSummary): number {
  if (subscription.vehicleCapacity === null || subscription.vehicleCapacity >= 999_999) {
    return Math.min(100, subscription.vehicleCount);
  }
  return Math.min(100, Math.round((subscription.vehicleCount / Math.max(1, subscription.vehicleCapacity)) * 100));
}
