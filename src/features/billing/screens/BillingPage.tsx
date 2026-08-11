import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Car,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  ExternalLink,
  Info,
  QrCode,
  RefreshCw,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import {
  usePaymentHistory,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  isSuccessfulPaymentStatus,
  PROVIDER_LABELS,
  type PaymentRecord,
} from "@/hooks/usePaymentHistory";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { isBffConfigured } from "@/lib/bff-config";
import { formatPublicPriceXaf } from "@/lib/public-pricing";
import { cn } from "@/lib/utils";
import { ContextualHelpTrigger } from "@/components/help/ContextualHelpTrigger";
import { buildSupportMailto, SUPPORT } from "@/config/navigation";
import { STATUS_CONFIG } from "@/features/billing/constants/billingStatusConfig";
import { useNotchPayCallback } from "@/features/billing/hooks/useNotchPayCallback";
import type { FleetBillingContext } from "@/types/fleet-billing";

// ─── Page principale ────────────────────────────────────────────────────────

export default function BillingPage() {
  const { userFleetId } = useAuth();
  const { can } = useRoleAccess();
  useNotchPayCallback();

  const billing        = useFleetBillingContext(userFleetId ?? undefined);
  const paymentHistory = usePaymentHistory();
  const canManageBilling = can("billing.manage");

  // ── Squelette chargement ──
  if (billing.isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // ── Erreur context billing ──
  if (billing.isError) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            Impossible de charger le contexte de facturation.{" "}
            {billing.error instanceof Error ? billing.error.message : "Erreur PostgREST."}{" "}
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => billing.refetch()}>
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const ctx: FleetBillingContext | undefined = billing.data;
  if (!ctx) return null;

  const statusCfg  = STATUS_CONFIG[ctx.billingStatus] ?? STATUS_CONFIG.trial;
  const StatusIcon = statusCfg.icon;
  const slotsPct   = ctx.vehicleSlots >= 999_999
    ? Math.min(100, Math.round((ctx.vehicleCount / Math.max(1, ctx.maxVehicles ?? 999999)) * 100))
    : Math.min(100, Math.round((ctx.vehicleCount / Math.max(1, ctx.vehicleSlots)) * 100));

  const expiryDate =
    ctx.billingStatus === "trial"  ? ctx.trialEndsAt         :
    ctx.billingStatus === "grace"  ? ctx.graceUntil          :
    ctx.subscriptionEndsAt;

  const expiryLabel = expiryDate
    ? isPast(new Date(expiryDate))
      ? `Expiré le ${format(new Date(expiryDate), "d MMM yyyy", { locale: fr })}`
      : `Expire ${formatDistanceToNow(new Date(expiryDate), { addSuffix: true, locale: fr })}`
    : null;

  const isGraceOrSuspended = ctx.billingStatus === "grace" || ctx.billingStatus === "suspended";
  const showUpgradeCta     = ctx.billingStatus !== "enterprise" && ctx.billingStatus !== "active";
  const canPayOnline       = isBffConfigured();

  // Modules actifs
  const modules = [
    { label: "Finances & collectes",  enabled: ctx.financeEnabled,          key: "finance"   },
    { label: "Rapports d'activité",   enabled: ctx.reportsEnabled,          key: "reports"   },
    { label: "Scoring conducteur",    enabled: ctx.driverScoringEnabled,    key: "scoring"   },
    { label: "IA Pulse+ (anomalies)", enabled: ctx.anomalyInsightsEnabled,  key: "anomaly"   },
    { label: "Géofencing",            enabled: ctx.geofencingEnabled,       key: "geo"       },
    { label: "Rapports auto PDF",     enabled: ctx.scheduledReportsEnabled, key: "scheduled" },
    { label: "Offline conducteur",    enabled: ctx.offlineDriverEnabled,    key: "offline"   },
    { label: "IA avancée (Pulse+)",   enabled: ctx.aiEnabled,              key: "ai"        },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">

      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abonnements & Facturation</h1>
          <p className="text-sm text-muted-foreground">
            Gérez votre plan, vos licences véhicules et l'historique de paiements
          </p>
          <ContextualHelpTrigger slug="subscription-overview" className="mt-2" />
        </div>
        <Badge className={cn("gap-1.5 px-3 py-1.5 text-sm font-medium border", statusCfg.badgeClass)}>
          <StatusIcon className="h-4 w-4" />
          {statusCfg.label}
        </Badge>
      </div>

      {/* ── Alertes contextuelles ─────────────────────────────────────── */}
      {statusCfg.alertTitle && (
        <Alert className={cn("flex items-start gap-3", statusCfg.alertClass)}>
          <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <AlertDescription className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{statusCfg.alertTitle}</p>
              <p className="text-sm opacity-90">
                {statusCfg.alertDesc}
                {expiryLabel && ctx.billingStatus !== "active" && (
                  <span className="ml-1 font-medium">· {expiryLabel}</span>
                )}
              </p>
            </div>
            {showUpgradeCta && canManageBilling && (
              <Button size="sm" className="shrink-0" asChild>
                <Link to={canPayOnline ? ROUTE_PATHS.pricing : ROUTE_PATHS.upgrade}>
                  <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                  Renouveler
                </Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" /> Plan actif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{ctx.planName ?? ctx.planCode}</p>
            {expiryLabel && (
              <p className="mt-1 text-xs text-muted-foreground">{expiryLabel}</p>
            )}
            {ctx.billingStatus === "active" && ctx.subscriptionEndsAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Renouvellement le {format(new Date(ctx.subscriptionEndsAt), "d MMM yyyy", { locale: fr })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Car className="h-4 w-4" /> Véhicules actifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold tabular-nums">
              {ctx.vehicleCount}
              <span className="text-base font-normal text-muted-foreground">
                {" "}/ {ctx.vehicleSlots >= 999_999 ? "∞" : ctx.vehicleSlots}
              </span>
            </p>
            <Progress value={slotsPct} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {ctx.activeVehicles} actif{ctx.activeVehicles !== 1 ? "s" : ""}
              {ctx.vehicleSlots < 999_999 && (
                <span className="ml-1">· {Math.max(0, ctx.vehicleSlots - ctx.vehicleCount)} slot{(ctx.vehicleSlots - ctx.vehicleCount) !== 1 ? "s" : ""} restant{(ctx.vehicleSlots - ctx.vehicleCount) !== 1 ? "s" : ""}</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Prochaine échéance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ctx.subscriptionEndsAt ? (
              <>
                <p className="text-2xl font-bold">
                  {format(new Date(ctx.subscriptionEndsAt), "d MMM yyyy", { locale: fr })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ctx.subscriptionEndsAt), { addSuffix: true, locale: fr })}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
            {ctx.billingStatus === "grace" && ctx.graceUntil && (
              <p className="mt-1 text-xs text-amber-600 font-medium">
                Grâce jusqu'au {format(new Date(ctx.graceUntil), "d MMM yyyy", { locale: fr })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modules activés (add-ons) ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Modules & add-ons actifs</h2>
          {isGraceOrSuspended && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
              <AlertTriangle className="h-3 w-3" />
              Premium désactivé
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {modules.map(({ label, enabled, key }) => (
            <div
              key={key}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                enabled
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-border bg-muted/30 text-muted-foreground",
              )}
            >
              {enabled
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                : <X className="h-3.5 w-3.5 shrink-0 opacity-40" />}
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
        {!modules.some((m) => m.enabled) && ctx.billingStatus !== "trial" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Aucun module premium actif. Passez à un plan payant pour les débloquer.
          </p>
        )}
      </section>

      {/* ── CTAs ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-muted/20 p-4">
        <h2 className="mb-3 text-base font-semibold">Actions rapides</h2>
        <div className="flex flex-wrap gap-2">
          {/* Renouveler / plans — organisateur + manager uniquement */}
          {canManageBilling && ctx.billingStatus !== "enterprise" && (
            <Button asChild size="sm" variant={showUpgradeCta ? "default" : "outline"}>
              <Link to={canPayOnline ? ROUTE_PATHS.pricing : ROUTE_PATHS.upgrade}>
                <CreditCard className="mr-1.5 h-4 w-4" />
                {showUpgradeCta ? "Renouveler / Upgrader" : "Voir les plans"}
              </Link>
            </Button>
          )}
          {canManageBilling && ctx.billingStatus === "enterprise" && (
            <Button asChild size="sm" variant="outline">
              <a href={buildSupportMailto("Renouvellement Enterprise")}>
                <ArrowUpRight className="mr-1.5 h-4 w-4" />
                Renouveler (Enterprise)
              </a>
            </Button>
          )}

          {/* Support — visible par tous */}
          <Button asChild size="sm" variant="outline">
            <a href={buildSupportMailto("Support facturation E-Samba")}>
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Email support
            </a>
          </Button>

          {/* Licences QR — organisateur + manager + paiement en ligne */}
          {canManageBilling && canPayOnline && (
            <Button asChild size="sm" variant="outline">
              <Link to={ROUTE_PATHS.pricing}>
                <QrCode className="mr-1.5 h-4 w-4" />
                Ajouter licences QR
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTE_PATHS.dashboardSubscriptions}>
              <ClipboardList className="mr-1.5 h-4 w-4" />
              Gérer les abonnements
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* ── Historique paiements ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Historique des paiements</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => paymentHistory.refetch()}
            disabled={paymentHistory.isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", paymentHistory.isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Erreur PostgREST */}
        {paymentHistory.isError && (
          <Alert variant="destructive" className="mb-3">
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription>
              {paymentHistory.errorMessage ?? "Impossible de charger l'historique."}
              <Button
                variant="link"
                size="sm"
                className="ml-2 p-0 h-auto"
                onClick={() => paymentHistory.refetch()}
              >
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Chargement */}
        {paymentHistory.isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        )}

        {/* État vide */}
        {!paymentHistory.isLoading && !paymentHistory.isError && paymentHistory.payments.length === 0 && (
          <EmptyState
            icon={<CreditCard className="h-8 w-8 text-muted-foreground/50" />}
            title="Aucun paiement enregistré"
            description="Votre premier paiement apparaîtra ici après confirmation du webhook Notch Pay."
          />
        )}

        {/* Liste paiements */}
        {paymentHistory.payments.length > 0 && (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium">Référence</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">Prestataire</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Détail</th>
                  <th className="px-4 py-2.5 text-right font-medium">Montant</th>
                  <th className="px-4 py-2.5 text-center font-medium">Statut</th>
                  <th className="px-4 py-2.5 text-center font-medium hidden sm:table-cell">Reçu</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paymentHistory.payments.map((p) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Accès terrain minimal (note info) ─────────────────────────── */}
      {ctx.billingStatus === "grace" && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <AlertDescription className="text-sm">
            <span className="font-semibold">Accès terrain conservé</span> — Les conducteurs peuvent
            toujours utiliser les fonctions de base (DVIR, clôture de service, suivi GPS essentiel).
            Les modules premium (Finance, IA, Rapports) sont suspendus jusqu'au renouvellement.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: PaymentRecord }) {
  const statusLabel = PAYMENT_STATUS_LABELS[payment.status] ?? payment.status;
  const statusClass = PAYMENT_STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-600";
  const providerLabel = PROVIDER_LABELS[payment.provider] ?? payment.provider;

  const detail = payment.planCode
    ? `${payment.planCode.toUpperCase()}${payment.vehicleCount ? ` · ${payment.vehicleCount} vhcl` : ""}${payment.durationMonths ? ` · ${payment.durationMonths} mois` : ""}`
    : null;

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {format(new Date(payment.created_at), "d MMM yyyy", { locale: fr })}
      </td>
      <td className="px-4 py-3 font-mono text-xs">
        {payment.external_ref ?? payment.provider_reference?.slice(0, 16) ?? payment.id.slice(0, 8)}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
        {providerLabel}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
        {detail ?? "—"}
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">
        {formatPublicPriceXaf(payment.amount)}{" "}
        <span className="text-xs font-normal text-muted-foreground">{payment.currency}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <Badge className={cn("text-xs", statusClass)}>{statusLabel}</Badge>
      </td>
      <td className="px-4 py-3 text-center hidden sm:table-cell">
        {isSuccessfulPaymentStatus(payment.status) ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Télécharger le reçu"
            onClick={() => downloadReceipt(payment)}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>
    </tr>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// ─── Génération reçu minimal (client-side) ────────────────────────────────

function downloadReceipt(p: PaymentRecord) {
  const lines = [
    "E-Samba — Reçu de paiement",
    "═".repeat(40),
    `Date        : ${format(new Date(p.created_at), "d MMMM yyyy HH:mm", { locale: fr })}`,
    `Référence   : ${p.external_ref ?? p.provider_reference ?? p.id}`,
    `Prestataire : ${PROVIDER_LABELS[p.provider] ?? p.provider}`,
    `Montant     : ${p.amount.toLocaleString("fr-FR")} ${p.currency}`,
    `Statut      : ${PAYMENT_STATUS_LABELS[p.status] ?? p.status}`,
    "─".repeat(40),
    `E-Samba · ${SUPPORT.email} · https://e-samba.com`,
  ].join("\n");

  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `recu-esamba-${p.external_ref ?? p.id.slice(0, 8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
